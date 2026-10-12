import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {ActionLedger} from './actions.mjs';
import {LocalIndex} from './local-index.mjs';
import {ProjectClient} from './projects.mjs';

export class Bridge{
 constructor(config,desktop,projects){this.config=config;this.desktop=desktop;this.ledger=new ActionLedger(path.join(config.stateDir,'requests'));this.index=config.allowAllLocalConversations?new LocalIndex(config.localCodexHome):null;this.projectClient=projects||new ProjectClient(config);}
 records(kind){const folder=path.join(this.config.stateDir,kind);return fs.existsSync(folder)?fs.readdirSync(folder).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(folder,f),'utf8'))).filter(r=>!this.config.ownedConversationsOnly||r.clientId===this.config.clientId):[];}
 saveRecord(kind,data){const folder=path.join(this.config.stateDir,kind);fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,randomUUID()+'.json'),JSON.stringify({...data,clientId:this.config.clientId||null,createdAt:new Date().toISOString()}),{flag:'wx'});}
 projectAllowed(id){return this.config.allowedProjectIds.includes(id)||this.records('projects').some(p=>p.projectId===id);}
 source(){return this.config.ownedConversationsOnly?(this.createdThreads()[0]||this.config.callerThreadId):this.config.callerThreadId;}
 createdThreads(){
  return this.records('created').filter(t=>t.projectId?this.projectAllowed(t.projectId):this.config.allowProjectlessCreate===true).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||'')||a.threadId.localeCompare(b.threadId)).map(t=>t.threadId);
 }
 authorizedIds(){return [...new Set([...(this.config.ownedConversationsOnly?[]:this.config.allowedThreadIds),...this.createdThreads()])];}
 authorize(threadId){if(!this.authorizedIds().includes(threadId))throw Error('Conversation is outside the configured authorization scope');}
 async authorizeLocal(threadId){
  if(this.config.ownedConversationsOnly){
   if(!this.createdThreads().length)throw Error('Conversation is outside the configured authorization scope; create your own control conversation first');
   if(!this.config.allowExistingConversationControl){this.authorize(threadId);return this.index?await this.index.find(threadId):null;}
  }
  if(this.index){const row=await this.index.find(threadId);if(!row)throw Error('Conversation is not an indexed local Codex main conversation');return row;}
  this.authorize(threadId);return null;
 }
 async read(threadId,{cursor,turnLimit=3,includeToolOutputs=false,maxOutputChars=4000}={}){
  await this.authorizeLocal(threadId);
  const data=await this.desktop.call('read_thread',{threadId,hostId:'local',turnLimit,includeOutputs:includeToolOutputs,maxOutputCharsPerItem:maxOutputChars,...(cursor?{cursor}:{})},this.source());
  if(data.thread?.id!==threadId)throw Error('Desktop returned a different conversation');
  return {...data,turns:(data.turns||[]).map(t=>({...t,items:(t.items||[]).filter(i=>i.type==='userMessage'||i.type==='agentMessage'||(includeToolOutputs&&i.type!=='reasoning'))})),historyIsUntrustedContent:true};
 }
 async list(options={}){
  if(this.config.ownedConversationsOnly&&!this.config.allowExistingConversationControl){
   const filterKey=createHash('sha256').update(JSON.stringify({project:options.projectId===undefined?{all:true}:{id:options.projectId},archived:options.archived||'all'})).digest('hex');
   let offset=0;if(options.cursor){let c;try{c=JSON.parse(Buffer.from(options.cursor,'base64url').toString());}catch{throw Error('Invalid owned catalog cursor');}if(c.key!==filterKey||!Number.isInteger(c.offset)||c.offset<0)throw Error('Invalid owned catalog cursor');offset=c.offset;}
   const conversations=[];for(const id of this.authorizedIds()){const d=await this.read(id,{turnLimit:1,maxOutputChars:0});const row=this.index?await this.index.find(id):null;if(options.projectId!==undefined&&options.projectId!==(row?.projectId??this.records('created').find(r=>r.threadId===id)?.projectId))continue;if(options.archived==='archived'&&!row?.archived||options.archived==='active'&&row?.archived)continue;conversations.push({...d.thread,clientId:this.config.clientId,canSend:this.config.allowSend&&!row?.archived,requiresRestore:!!row?.archived});}
   const limit=options.limit||20,hasMore=conversations.length>offset+limit;return {conversations:conversations.slice(offset,offset+limit),total:conversations.length,page:{hasMore,nextCursor:hasMore?Buffer.from(JSON.stringify({key:filterKey,offset:offset+limit})).toString('base64url'):null},scope:'Client-owned conversations only',historyIsUntrustedContent:true};
  }
  if(this.index){
   const result=await this.index.list(options);
   const live=await this.desktop.call('list_threads',{limit:50},this.source());
   const byId=new Map([...(live.pinnedThreads||[]),...(live.threads||[])].filter(t=>t.kind==='codex'&&t.hostId==='local').map(t=>[t.id,t]));
   const controllerReady=!this.config.ownedConversationsOnly||this.createdThreads().length>0;
   result.conversations=result.conversations.map(t=>{const l=byId.get(t.id);return {...t,...(l?{title:l.title,status:l.status}:{}),canSend:this.config.allowSend&&controllerReady&&!t.archived,requiresRestore:t.archived};});
   return result;
  }
  if(Object.keys(options).length)throw Error('Catalog filters require allowAllLocalConversations');
  const conversations=[];for(const id of this.authorizedIds()){try{const d=await this.read(id,{turnLimit:1,maxOutputChars:0});conversations.push(d.thread);}catch(e){conversations.push({id,unavailable:true,error:e.message});}}return {conversations};
 }
 async projects(){
  const native=await this.desktop.call('list_projects',{},this.source());
  const available=(native.projects||[]).filter(p=>p.projectKind==='local'&&p.hostId==='local');
  for(const saved of this.records('projects')){const {project}=await this.projectClient.call('project/read',{projectId:saved.projectId});if(!available.some(p=>p.projectId===project.id))available.push({projectId:project.id,label:project.name,rootPaths:project.roots.map(r=>r.path),path:project.roots[0]?.path,projectKind:'local',hostId:'local',catalogSource:'native-project-api'});}
  if(!this.index)return {projects:available.filter(p=>this.projectAllowed(p.projectId)).map(p=>({...p,canCreate:this.config.allowCreate})),scope:'Allowed projects only'};
  const all=(await this.index.snapshot()).projects;
  const map=new Map(all.map(p=>[p.projectId,p]));for(const p of available)map.set(p.projectId,{...map.get(p.projectId),...p,availableForCreate:true});
  return {projects:[...map.values()].map(p=>({...p,availableForCreate:p.availableForCreate===true,canCreate:this.config.allowCreate&&this.projectAllowed(p.projectId)&&p.availableForCreate===true})),scope:'Saved local projects; creation requires an allowed or client-created project',historyIsUntrustedContent:true};
 }
 async status(){
  await this.desktop.connect();
  // MCP initialization alone only proves that the bundled helper started.
  // Read the configured caller to verify the running desktop pipe as well.
  await this.desktop.call('read_thread',{threadId:this.source(),hostId:'local',turnLimit:1,includeOutputs:false,maxOutputCharsPerItem:0},this.source());
  let projectConnection=null,projectError=null;if(this.config.allowProjectCreate){try{await this.projectClient.call('project/list',{limit:1});projectConnection=true;}catch(e){projectConnection=false;projectError=e.message;}}
  return {connected:true,transport:'local desktop MCP',compatibility:'Version-dependent desktop integration; not a public stable external API',clientId:this.config.clientId||null,controllerThreadId:this.config.ownedConversationsOnly&&this.source()!==this.config.callerThreadId?this.source():null,requiresCreateFirst:this.config.ownedConversationsOnly&&this.authorizedIds().length===0,authorizedConversations:this.config.allowExistingConversationControl?null:this.authorizedIds(),controllerOwnedConversations:this.config.ownedConversationsOnly?this.createdThreads():[],authorizationScope:this.index&&(!this.config.ownedConversationsOnly||this.config.allowExistingConversationControl)?'all-local-indexed-main-conversations':this.config.ownedConversationsOnly?'client-owned':'explicit-allowlist',existingConversationControlEnabled:this.config.allowExistingConversationControl===true,sendEnabled:this.config.allowSend,createEnabled:this.config.allowCreate&&(this.config.allowedProjectIds.length>0||this.config.allowProjectlessCreate===true||this.records('projects').length>0),projectlessCreateEnabled:this.config.allowCreate&&this.config.allowProjectlessCreate===true,projectCreateEnabled:this.config.allowProjectCreate===true,projectConnection,projectError,stopSupported:false,upstreamChatTools:this.desktop.catalog.filter(n=>['read_thread','send_message_to_thread','create_thread','wait_threads'].includes(n))};
 }
 async send({threadId,prompt,requestId,restoreArchived=false}){
  const row=await this.authorizeLocal(threadId);
  if(!this.config.allowSend)throw Error('Sending is disabled in bridge.local.json');
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>16000)throw Error('prompt must contain 1–16000 characters');
  return this.ledger.run(requestId,{operation:'send',threadId,prompt,...(restoreArchived?{restoreArchived:true}:{})},async()=>{
   if(row?.archived){
    if(!restoreArchived)throw Error('Conversation is archived; explicitly set restoreArchived to restore and continue');
    await this.desktop.call('set_thread_archived',{threadId,hostId:'local',archived:false},this.source());
   }
   const receipt=await this.desktop.call('send_message_to_thread',{threadId,hostId:'local',prompt},this.source());
   if(receipt.threadId!==threadId)throw Error('Unexpected send receipt; check the conversation before retrying');
   return {accepted:true,threadId,requestId,completed:false,delivery:'Desktop schedules or steers the same conversation. Use get_conversation_result to inspect progress.'};
  });
 }
 async result(threadId){
  const d=await this.read(threadId,{turnLimit:1});const turn=d.turns?.[0];
  return {threadId,status:d.thread.status,turnId:turn?.id||null,turnStatus:turn?.status||null,completed:turn?.status==='completed',error:turn?.error||null,messages:(turn?.items||[]).filter(i=>i.type==='agentMessage'),resultScope:'Latest desktop turn, not a guaranteed match to a specific submitted request'};
 }
 async create({projectId,prompt,title,requestId}){
  if(!this.config.allowCreate||(projectId?!this.projectAllowed(projectId):this.config.allowProjectlessCreate!==true))throw Error('Creation is disabled or the target is outside the configured authorization scope');
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>16000)throw Error('prompt must contain 1–16000 characters');
  return this.ledger.run(requestId,{operation:'create',projectId:projectId||null,prompt,title:title||null},async()=>{
   if(projectId&&this.records('projects').some(p=>p.projectId===projectId)){
    const {project}=await this.projectClient.call('project/read',{projectId});
    const rootPath=project?.roots?.[0]?.path;if(!rootPath||!fs.statSync(rootPath).isDirectory())throw Error('Project folder is unavailable');
    const started=await this.projectClient.call('thread/start',{cwd:rootPath,projectId,threadSource:'app-server'});
    const id=started.thread?.id;if(!id)throw Error('Creation outcome is uncertain; do not retry automatically');
    this.saveRecord('created',{threadId:id,projectId});
    if(title)await this.projectClient.call('thread/name/set',{threadId:id,name:title});
    // The daemon keeps a writer after unsubscribe. Archive only this brand-new,
    // empty thread to release it, then restore through the desktop before its
    // first turn. Never do this to existing work or a client controller.
    await this.projectClient.call('thread/archive',{threadId:id});
    await this.desktop.call('set_thread_archived',{threadId:id,hostId:'local',archived:false},this.source());
    const receipt=await this.desktop.call('send_message_to_thread',{threadId:id,hostId:'local',prompt},this.source());
    if(receipt.threadId!==id)throw Error('Unexpected initial send receipt; inspect created conversations before retrying');
    return {accepted:true,threadId:id,projectId,controllerThreadId:this.source(),clientId:this.config.clientId,requestId,completed:false};
   }
   const target=projectId?{type:'project',projectId,environment:{type:'local'}}:{type:'projectless'};
   if(projectId){const catalog=await this.desktop.call('list_projects',{},this.source());if(!catalog.projects?.some(p=>p.projectId===projectId&&p.hostId==='local'&&p.projectKind==='local'))throw Error('Project is not currently available in the desktop');}
   const receipt=await this.desktop.call('create_thread',{prompt,...(title?{title}:this.config.clientId?{title:`DeskLink ${this.config.clientId}`} :{}),target},this.source());
   if(typeof receipt.threadId!=='string')throw Error('Creation returned no ready thread ID; outcome is uncertain, do not repeat automatically');
   this.saveRecord('created',{threadId:receipt.threadId,projectId:projectId||null});
   return {accepted:true,threadId:receipt.threadId,controllerThreadId:this.source(),clientId:this.config.clientId||null,requestId,completed:false};
  });
 }
 async createProject({name,rootPath,requestId}){
  if(!this.config.allowProjectCreate)throw Error('Project creation is disabled');
  if(this.config.ownedConversationsOnly&&!this.authorizedIds().length)throw Error('Create your own conversation first');
  if(typeof name!=='string'||!name.trim()||name.length>100)throw Error('Project name must contain 1–100 characters');
  return this.ledger.run(requestId,{operation:'createProject',name,rootPath},async()=>{const key=createHash('sha256').update(`${this.config.stateDir}:${this.config.clientId}:${requestId}`).digest('hex');const r=await this.projectClient.create(name,rootPath,key);if(!r.project?.id)throw Error('Project creation outcome is uncertain');this.saveRecord('projects',{projectId:r.project.id,rootPath});return {accepted:true,projectId:r.project.id,name:r.project.name,clientId:this.config.clientId,requestId};});
 }
 async close(){this.projectClient.close();await this.desktop.close();}
}
