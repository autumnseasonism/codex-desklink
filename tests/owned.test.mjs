import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Bridge} from '../bridge.mjs';
import {loadConfig} from '../config.mjs';
import {ProjectClient} from '../projects.mjs';

function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'desklink-owned-')),server=path.join(root,'server.mjs');fs.writeFileSync(server,'');
 const config=id=>{const f=path.join(root,id+'.json');fs.writeFileSync(f,JSON.stringify({callerThreadId:'bootstrap',allowedThreadIds:['bootstrap'],clientId:id,ownedConversationsOnly:true,allowSend:true,allowCreate:true,allowProjectlessCreate:true,pipePath:'\\\\.\\pipe\\codex-browser-use-test',appToolsServerPath:server,stateDir:root}));return loadConfig(f);};
 const calls=[];let seq=0;const desktop={catalog:['read_thread','send_message_to_thread','create_thread'],async connect(){},async close(){},async call(name,args,source){calls.push({name,args,source});if(name==='read_thread')return {thread:{id:args.threadId},turns:[]};if(name==='create_thread')return {threadId:'owned-'+(++seq)};if(name==='set_thread_archived')return {};if(name==='send_message_to_thread')return {threadId:args.threadId};if(name==='list_projects')return {projects:[{projectId:'new-project',projectKind:'local',hostId:'local'}]};throw Error(name);}};
 return {root,config,desktop,calls};
}
test('PI and Claude must create first; ownership, ledgers and source survive restart',async()=>{
 const f=fixture(),pc=f.config('pi'),cc=f.config('claude'),pi=new Bridge(pc,f.desktop),claude=new Bridge(cc,f.desktop);
 assert.notEqual(pc.stateDir,cc.stateDir);await assert.rejects(pi.send({threadId:'bootstrap',prompt:'x',requestId:'blocked-001'}),/authorization scope/);assert.equal(f.calls.length,0);
 assert.equal((await pi.status()).requiresCreateFirst,true);
 const root=await pi.create({prompt:'pi control',title:'PI chosen title',requestId:'same-id-001'});assert.equal(root.controllerThreadId,root.threadId);assert.equal(f.calls.at(-1).args.title,'PI chosen title');
 const child=await pi.create({prompt:'pi work',requestId:'child-id-001'});assert.equal(f.calls.at(-1).source,root.threadId);
 await new Bridge(pc,f.desktop).send({threadId:child.threadId,prompt:'next',requestId:'send-id-001'});assert.equal(f.calls.at(-1).source,root.threadId);
 const count=f.calls.length;await assert.rejects(claude.read(root.threadId),/authorization scope/);assert.equal(f.calls.length,count);
 const cr=await claude.create({prompt:'claude control',requestId:'same-id-001'});assert.notEqual(cr.threadId,root.threadId);
 const replay=await pi.create({prompt:'pi control',title:'PI chosen title',requestId:'same-id-001'});assert.equal(replay.replayed,true);
 const page=await pi.list({limit:1});assert.equal(page.page.hasMore,true);const next=await pi.list({limit:1,cursor:page.page.nextCursor});assert.equal(next.page.hasMore,false);assert.equal(next.conversations[0].id,child.threadId);
 await assert.rejects(pi.list({cursor:page.page.nextCursor,archived:'archived'}),/cursor/);
});
test('Existing target control is independent of controller ownership, with create-first and local-index checks',async()=>{
 const f=fixture(),c={...f.config('pi'),allowAllLocalConversations:true,allowExistingConversationControl:true},b=new Bridge(c,f.desktop);
 const rows=[{id:'existing-old',archived:false},{id:'claude-owned',archived:false},{id:'archived-old',archived:true}];
 b.index={async find(id){return rows.find(r=>r.id===id)||null;},async list(){return {conversations:rows,total:3};}};
 const call=f.desktop.call.bind(f.desktop);f.desktop.call=async(name,args,source)=>name==='list_threads'?{threads:[],pinnedThreads:[]}:call(name,args,source);
 assert.equal((await b.list()).conversations.every(r=>!r.canSend),true);
 await assert.rejects(b.read('existing-old'),/first/);await assert.rejects(b.send({threadId:'existing-old',prompt:'x',requestId:'precreate-001'}),/first/);
 const controller=await b.create({prompt:'control',requestId:'broad-control-001'});
 assert.equal((await b.status()).authorizationScope,'all-local-indexed-main-conversations');
 assert.equal((await b.status()).authorizedConversations,null);
 assert.deepEqual((await b.status()).controllerOwnedConversations,[controller.threadId]);
 assert.equal((await b.status()).requiresCreateFirst,false);
 assert.equal((await b.list()).conversations[0].canSend,true);
 await b.read('claude-owned');assert.equal(f.calls.at(-1).source,controller.threadId);
 const args={threadId:'existing-old',prompt:'continue',requestId:'existing-send-001'};
 await b.send(args);assert.equal(f.calls.at(-1).args.threadId,'existing-old');assert.equal(f.calls.at(-1).source,controller.threadId);
 const n=f.calls.length;assert.equal((await b.send(args)).replayed,true);assert.equal(f.calls.length,n);
 await assert.rejects(b.send({threadId:'cloud-or-subagent',prompt:'x',requestId:'nonlocal-001'}),/indexed local/);
 await assert.rejects(b.send({threadId:'archived-old',prompt:'x',requestId:'archived-001'}),/explicitly/);
 await b.send({threadId:'archived-old',prompt:'x',requestId:'restore-001',restoreArchived:true});assert.equal(f.calls.at(-2).name,'set_thread_archived');assert.equal(f.calls.at(-2).source,controller.threadId);
 const restarted=new Bridge(c,f.desktop);restarted.index=b.index;await restarted.read('existing-old');assert.equal(f.calls.at(-1).source,controller.threadId);
});
test('Existing target control cannot be enabled without a dedicated controller and local index',()=>{
 const f=fixture(),file=path.join(f.root,'pi.json');f.config('pi');const c=JSON.parse(fs.readFileSync(file));c.allowExistingConversationControl=true;fs.writeFileSync(file,JSON.stringify(c));assert.throws(()=>loadConfig(file),/local index/);
 c.allowAllLocalConversations=true;c.ownedConversationsOnly=false;fs.writeFileSync(file,JSON.stringify(c));assert.throws(()=>loadConfig(file),/dedicated client/);
});
test('Real project registration requires a prior owned chat, is deduplicated, and grants only that client creation',async()=>{
 const f=fixture(),pc={...f.config('pi'),allowProjectCreate:true};let n=0;const projects={async create(name,rootPath,key){n++;assert.match(key,/^[a-f0-9]{64}$/);return {project:{id:'new-project',name}};},async call(method){if(method==='project/read')return {project:{id:'new-project',name:'new',roots:[{path:f.root}]}};if(method==='thread/start')return {thread:{id:'native-worker'}};return {data:[]};},close(){}};
 const pi=new Bridge(pc,f.desktop,projects),claude=new Bridge(f.config('claude'),f.desktop,projects);
 const args={name:'new',rootPath:f.root,requestId:'project-id-001'};
 await assert.rejects(pi.createProject(args),/first/);assert.equal(n,0);
 await pi.create({prompt:'control',requestId:'control-001'});const r=await pi.createProject(args);assert.equal(r.projectId,'new-project');assert.equal((await pi.createProject(args)).replayed,true);assert.equal(n,1);
 await pi.create({projectId:r.projectId,prompt:'work',requestId:'project-work-001'});
 assert.equal(f.calls.at(-1).name,'send_message_to_thread');assert.equal(f.calls.at(-1).args.threadId,'native-worker');assert.equal(f.calls.at(-1).source,pi.source());
 await assert.rejects(claude.create({projectId:r.projectId,prompt:'x',requestId:'wrong-owner-001'}),/authorization scope/);
});
test('Project folder validation rejects escapes including junctions and leaves disk content unchanged',async()=>{
 const f=fixture(),inside=path.join(f.root,'inside'),outside=fs.mkdtempSync(path.join(os.tmpdir(),'desklink-outside-'));fs.mkdirSync(inside);
 const c=new ProjectClient({allowedProjectRoots:[inside]});let calls=0;c.call=async()=>{calls++;return {project:{id:'p'}};};
 await assert.rejects(c.create('x',outside,'key'),/outside/);await assert.rejects(c.create('x','relative','key'),/absolute/);
 fs.symlinkSync(outside,path.join(inside,'escape'),process.platform==='win32'?'junction':'dir');await assert.rejects(c.create('x',path.join(inside,'escape'),'key'),/outside/);
 await c.create('x',inside,'key');assert.equal(calls,1);assert.deepEqual(fs.readdirSync(outside),[]);
});
test('Project connection failure is explicit without hiding other enabled capabilities',async()=>{
 const f=fixture(),c={...f.config('pi'),allowProjectCreate:true},b=new Bridge(c,f.desktop,{async call(){throw Error('offline');},close(){}});
 const s=await b.status();assert.equal(s.projectCreateEnabled,true);assert.equal(s.projectConnection,false);assert.equal(s.projectError,'offline');assert.equal(s.sendEnabled,true);assert.equal(s.createEnabled,true);
});
test('A failed new-thread handoff keeps ownership and uncertain receipt without sending or duplicating',async()=>{
 const f=fixture(),c={...f.config('pi'),allowProjectCreate:true};const order=[];
 const projects={async create(){return {project:{id:'new-project',name:'new'}};},async call(method){order.push(method);if(method==='project/read')return {project:{id:'new-project',roots:[{path:f.root}]}};if(method==='thread/start')return {thread:{id:'empty-worker'}};return {};},close(){}};
 const b=new Bridge(c,f.desktop,projects);await b.create({prompt:'control',requestId:'handoff-root-001'});await b.createProject({name:'new',rootPath:f.root,requestId:'handoff-project-001'});
 const call=f.desktop.call.bind(f.desktop);f.desktop.call=async(name,args,source)=>{if(name==='set_thread_archived'){order.push('desktop-restore');throw Error('restore failed');}return call(name,args,source);};
 const args={projectId:'new-project',prompt:'work',title:'new worker',requestId:'handoff-worker-001'};
 await assert.rejects(b.create(args),/restore failed/);assert.deepEqual(order,['project/read','thread/start','thread/name/set','thread/archive','desktop-restore']);
 assert.doesNotThrow(()=>b.authorize('empty-worker'));assert.equal(f.calls.filter(c=>c.name==='send_message_to_thread').length,0);
 const count=order.length;await assert.rejects(b.create(args),/pending or uncertain/);assert.equal(order.length,count);
});
