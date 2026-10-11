import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {ActionLedger} from './actions.mjs';
import {LocalIndex} from './local-index.mjs';

export class Bridge{
 constructor(config,desktop){this.config=config;this.desktop=desktop;this.ledger=new ActionLedger(path.join(config.stateDir,'requests'));this.index=config.allowAllLocalConversations?new LocalIndex(config.localCodexHome):null;}
 createdThreads(){
  const folder=path.join(this.config.stateDir,'created');
  if(!fs.existsSync(folder))return [];
  return fs.readdirSync(folder).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(folder,f),'utf8'))).filter(t=>t.projectId?this.config.allowedProjectIds.includes(t.projectId):this.config.allowProjectlessCreate===true).map(t=>t.threadId);
 }
 authorizedIds(){return [...new Set([...this.config.allowedThreadIds,...this.createdThreads()])];}
 authorize(threadId){if(!this.authorizedIds().includes(threadId))throw Error('Conversation is outside the configured authorization scope');}
 async authorizeLocal(threadId){
  if(this.index){const row=await this.index.find(threadId);if(!row)throw Error('Conversation is not an indexed local Codex main conversation');return row;}
  this.authorize(threadId);return null;
 }
 async read(threadId,{cursor,turnLimit=3,includeToolOutputs=false,maxOutputChars=4000}={}){
  await this.authorizeLocal(threadId);
  const data=await this.desktop.call('read_thread',{threadId,hostId:'local',turnLimit,includeOutputs:includeToolOutputs,maxOutputCharsPerItem:maxOutputChars,...(cursor?{cursor}:{})});
  if(data.thread?.id!==threadId)throw Error('Desktop returned a different conversation');
  return {...data,turns:(data.turns||[]).map(t=>({...t,items:(t.items||[]).filter(i=>i.type==='userMessage'||i.type==='agentMessage'||(includeToolOutputs&&i.type!=='reasoning'))})),historyIsUntrustedContent:true};
 }
 async list(options={}){
  if(this.index){
   const result=await this.index.list(options);
   const live=await this.desktop.call('list_threads',{limit:50});
   const byId=new Map([...(live.pinnedThreads||[]),...(live.threads||[])].filter(t=>t.kind==='codex'&&t.hostId==='local').map(t=>[t.id,t]));
   result.conversations=result.conversations.map(t=>{const l=byId.get(t.id);return {...t,...(l?{title:l.title,status:l.status}:{}),canSend:this.config.allowSend&&!t.archived,requiresRestore:t.archived};});
   return result;
  }
  if(Object.keys(options).length)throw Error('Catalog filters require allowAllLocalConversations');
  const conversations=[];for(const id of this.authorizedIds()){try{const d=await this.read(id,{turnLimit:1,maxOutputChars:0});conversations.push(d.thread);}catch(e){conversations.push({id,unavailable:true,error:e.message});}}return {conversations};
 }
 async projects(){
  const native=await this.desktop.call('list_projects',{});
  const available=(native.projects||[]).filter(p=>p.projectKind==='local'&&p.hostId==='local');
  if(!this.index)return {projects:available.filter(p=>this.config.allowedProjectIds.includes(p.projectId)),scope:'Allowed projects only'};
  const all=(await this.index.snapshot()).projects;
  const map=new Map(all.map(p=>[p.projectId,p]));for(const p of available)map.set(p.projectId,{...map.get(p.projectId),...p,availableForCreate:true});
  return {projects:[...map.values()].map(p=>({...p,availableForCreate:p.availableForCreate===true,canCreate:this.config.allowCreate&&this.config.allowedProjectIds.includes(p.projectId)&&p.availableForCreate===true})),scope:'Saved local projects, including currently unavailable folders; creation remains separately allowlisted',historyIsUntrustedContent:true};
 }
 async status(){
  await this.desktop.connect();
  // MCP initialization alone only proves that the bundled helper started.
  // Read the configured caller to verify the running desktop pipe as well.
  await this.read(this.config.callerThreadId,{turnLimit:1,maxOutputChars:0});
  return {connected:true,transport:'local desktop MCP',compatibility:'Version-dependent desktop integration; not a public stable external API',authorizedConversations:this.authorizedIds(),authorizationScope:this.index?'all-local-indexed-main-conversations':'explicit-allowlist',sendEnabled:this.config.allowSend,createEnabled:this.config.allowCreate&&(this.config.allowedProjectIds.length>0||this.config.allowProjectlessCreate===true),projectlessCreateEnabled:this.config.allowCreate&&this.config.allowProjectlessCreate===true,stopSupported:false,upstreamChatTools:this.desktop.catalog.filter(n=>['read_thread','send_message_to_thread','create_thread','wait_threads'].includes(n))};
 }
 async send({threadId,prompt,requestId,restoreArchived=false}){
  const row=await this.authorizeLocal(threadId);
  if(!this.config.allowSend)throw Error('Sending is disabled in bridge.local.json');
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>16000)throw Error('prompt must contain 1–16000 characters');
  return this.ledger.run(requestId,{operation:'send',threadId,prompt,...(restoreArchived?{restoreArchived:true}:{})},async()=>{
   if(row?.archived){
    if(!restoreArchived)throw Error('Conversation is archived; explicitly set restoreArchived to restore and continue');
    await this.desktop.call('set_thread_archived',{threadId,hostId:'local',archived:false});
   }
   const receipt=await this.desktop.call('send_message_to_thread',{threadId,hostId:'local',prompt});
   if(receipt.threadId!==threadId)throw Error('Unexpected send receipt; check the conversation before retrying');
   return {accepted:true,threadId,requestId,completed:false,delivery:'Desktop schedules or steers the same conversation. Use get_conversation_result to inspect progress.'};
  });
 }
 async result(threadId){
  const d=await this.read(threadId,{turnLimit:1});const turn=d.turns?.[0];
  return {threadId,status:d.thread.status,turnId:turn?.id||null,turnStatus:turn?.status||null,completed:turn?.status==='completed',error:turn?.error||null,messages:(turn?.items||[]).filter(i=>i.type==='agentMessage'),resultScope:'Latest desktop turn, not a guaranteed match to a specific submitted request'};
 }
 async create({projectId,prompt,title,requestId}){
  if(!this.config.allowCreate||(projectId?!this.config.allowedProjectIds.includes(projectId):this.config.allowProjectlessCreate!==true))throw Error('Creation is disabled or the target is outside the configured authorization scope');
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>16000)throw Error('prompt must contain 1–16000 characters');
  return this.ledger.run(requestId,{operation:'create',projectId:projectId||null,prompt,title:title||null},async()=>{
   const target=projectId?{type:'project',projectId,environment:{type:'local'}}:{type:'projectless'};
   const receipt=await this.desktop.call('create_thread',{prompt,...(title?{title}:{}),target});
   if(typeof receipt.threadId!=='string')throw Error('Creation returned no ready thread ID; outcome is uncertain, do not repeat automatically');
   const folder=path.join(this.config.stateDir,'created');fs.mkdirSync(folder,{recursive:true});
   fs.writeFileSync(path.join(folder,randomUUID()+'.json'),JSON.stringify({threadId:receipt.threadId,projectId:projectId||null}),{flag:'wx'});
   return {accepted:true,threadId:receipt.threadId,requestId,completed:false};
  });
 }
}
