import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {LocalIndex} from '../local-index.mjs';
import {Bridge} from '../bridge.mjs';

function fixture(){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'codex-index-test-'));
 const db=new DatabaseSync(path.join(home,'state_5.sqlite'));
 db.exec('CREATE TABLE projects(id TEXT,name TEXT,position INTEGER); CREATE TABLE threads(id TEXT,name TEXT,title TEXT,cwd TEXT,updated_at INTEGER,archived INTEGER,project_id TEXT,source TEXT,agent_path TEXT)');
 db.prepare('INSERT INTO projects VALUES(?,?,?)').run('db-project','Project',0);
 const insert=db.prepare('INSERT INTO threads VALUES(?,?,?,?,?,?,?,?,?)');
 for(let n=0;n<121;n++)insert.run('main-'+String(n).padStart(3,'0'),null,'Chat '+n,home,1000,Number(n<16),null,'vscode',null);
 insert.run('internal',null,'Internal',home,1000,0,null,'{"subagent":{"other":"guardian"}}',null);
 insert.run('child-with-source',null,'Child',home,1000,0,null,'vscode','/root/child');
 db.close();
 fs.writeFileSync(path.join(home,'.codex-global-state.json'),JSON.stringify({'local-projects':{'legacy-project':{name:'Project',rootPaths:[home]}},'app-server-project-id-by-legacy-project-id-by-host':{['local:'+home]:{'legacy-project':'db-project'}},'thread-project-assignments':{'main-120':{projectKind:'local',projectId:'legacy-project'}}}));
 return home;
}
test('Full catalog passes 50-item boundary, filters projects/archives, excludes internal chats, and opens DB read-only',async()=>{
 const home=fixture(),index=new LocalIndex(home),before=fs.readFileSync(path.join(home,'state_5.sqlite'));
 let cursor,ids=[];do{const p=await index.list({limit:50,...(cursor?{cursor}:{})});assert.equal(p.total,121);ids.push(...p.conversations.map(t=>t.id));cursor=p.page.nextCursor;}while(cursor);
 assert.equal(ids.length,121);assert.equal(new Set(ids).size,121);
 assert.equal((await index.list({archived:'archived'})).total,16);
 assert.equal((await index.list({projectId:'legacy-project'})).total,1);
 assert.equal((await index.list({projectId:null})).total,120);
 assert.equal((await index.snapshot()).projects[0].projectId,'legacy-project');
 assert.equal(await index.find('internal'),undefined);assert.equal(await index.find('child-with-source'),undefined);
 const p=await index.list({limit:1});await assert.rejects(index.list({cursor:p.page.nextCursor,archived:'archived'}),/filters/);
 await assert.rejects(index.list({cursor:p.page.nextCursor,projectId:null}),/filters/);
 assert.deepEqual(fs.readFileSync(path.join(home,'state_5.sqlite')),before);
});
function bridge(home,{send=true}={}){
 const config={callerThreadId:'main-120',allowedThreadIds:['main-120'],allowedProjectIds:[],allowAllLocalConversations:true,localCodexHome:home,allowSend:send,stateDir:path.join(home,'state')};
 const desktop={calls:[],async call(name,args){this.calls.push({name,args});if(name==='read_thread')return {thread:{id:args.threadId},turns:[]};if(name==='send_message_to_thread')return {threadId:args.threadId};if(name==='list_threads')return {threads:[{id:'remote',kind:'codex',hostId:'durable'}]};if(name==='list_projects')return {projects:[]};return {};}};
 return {b:new Bridge(config,desktop),d:desktop};
}
test('All-local opt-in reads older chats but rejects cloud, unknown and internal IDs before desktop calls',async()=>{
 const {b,d}=bridge(fixture());await b.read('main-100');assert.equal(d.calls[0].args.hostId,'local');d.calls=[];
 for(const id of ['remote','internal','child-with-source','nonexistent'])await assert.rejects(b.read(id),/indexed local/);
 assert.equal(d.calls.length,0);const {b:ro,d:rd}=bridge(fixture(),{send:false});await assert.rejects(ro.send({threadId:'main-100',prompt:'x',requestId:'readonly-001'}),/disabled/);assert.equal(rd.calls.length,0);
});
test('Dedicated client can continue an older indexed main chat without admitting internal or missing targets',async()=>{
 const {b,d}=bridge(fixture());Object.assign(b.config,{ownedConversationsOnly:true,clientId:'pi',allowExistingConversationControl:true,allowProjectlessCreate:true});
 b.saveRecord('created',{threadId:'main-120',projectId:null});
 const call=d.call.bind(d);d.call=async(name,args,source)=>{assert.equal(source,'main-120');return call(name,args);};
 await b.send({threadId:'main-100',prompt:'continue older chat',requestId:'dedicated-older-001'});assert.equal(d.calls.at(-1).args.threadId,'main-100');
 const n=d.calls.length;for(const id of ['remote','internal','child-with-source','nonexistent'])await assert.rejects(b.send({threadId:id,prompt:'x',requestId:'invalid-target-001'}),/indexed local/);assert.equal(d.calls.length,n);
});
test('Archived send requires explicit restore, restores before sending, and never duplicates accepted delivery',async()=>{
 const {b,d}=bridge(fixture());await assert.rejects(b.send({threadId:'main-000',prompt:'x',requestId:'archive-no-restore'}),/archived/);assert.equal(d.calls.length,0);
 const args={threadId:'main-000',prompt:'x',requestId:'archive-restore',restoreArchived:true};await b.send(args);assert.deepEqual(d.calls.map(c=>c.name),['set_thread_archived','send_message_to_thread']);assert.equal(d.calls[0].args.archived,false);assert.equal(d.calls[0].args.hostId,'local');await b.send(args);assert.equal(d.calls.length,2);
});
test('Failed restore never sends or retries; catalog access never grants project creation',async()=>{
 const {b,d}=bridge(fixture());d.call=async name=>{d.calls.push({name});throw Error('restore unavailable');};const args={threadId:'main-000',prompt:'x',requestId:'archive-fail',restoreArchived:true};await assert.rejects(b.send(args),/unavailable/);await assert.rejects(b.send(args),/pending or uncertain/);assert.deepEqual(d.calls.map(c=>c.name),['set_thread_archived']);await assert.rejects(b.create({projectId:'legacy-project',prompt:'x',requestId:'create-anywhere'}),/disabled/);
});
