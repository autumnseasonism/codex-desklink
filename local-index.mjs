import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Version-specific, metadata-only adapter. Never open the desktop DB for writes.
export class LocalIndex{
 constructor(home){this.home=home;}
 async snapshot(){
  const {DatabaseSync}=await import('node:sqlite');
  const db=new DatabaseSync(path.join(this.home,'state_5.sqlite'),{readOnly:true});
  try{
   const state=JSON.parse(fs.readFileSync(path.join(this.home,'.codex-global-state.json'),'utf8'));
   const local=state['local-projects'];
   if(!local||typeof local!=='object'||Array.isArray(local))throw Error('Unsupported desktop project metadata schema');
   const maps=state['app-server-project-id-by-legacy-project-id-by-host']||{};
   const map=maps['local:'+this.home]||maps['local:'+this.home.replaceAll('/','\\')]||{};
   const reverse=new Map(Object.entries(map).map(([legacy,id])=>[id,legacy]));
   const projects=db.prepare('SELECT id,name FROM projects ORDER BY position,id').all().map(p=>{
    const id=reverse.get(p.id)||p.id,cached=local[id];
    return {projectId:id,label:cached?.name||p.name,hostId:'local',rootPaths:Array.isArray(cached?.rootPaths)?cached.rootPaths:[],catalogSource:'local-index'};
   });
   const assignments=state['thread-project-assignments']||{};
   const rows=db.prepare("SELECT id,name,title,cwd,updated_at,archived,project_id FROM threads WHERE source IN ('vscode','cli','exec','app-server') AND agent_path IS NULL ORDER BY updated_at DESC,id DESC").all();
   const conversations=rows.map(t=>({id:t.id,title:(t.name||t.title||t.id).slice(0,300),cwd:t.cwd,updatedAt:t.updated_at,archived:t.archived===1,projectId:assignments[t.id]?.projectKind==='local'?assignments[t.id].projectId:(reverse.get(t.project_id)||t.project_id||null),hostId:'local',kind:'codex',status:null,catalogSource:'local-index'}));
   return {projects,conversations};
  }finally{db.close();}
 }
 async find(id){return (await this.snapshot()).conversations.find(t=>t.id===id);}
 async list({projectId,archived='all',cursor,limit=20}={}){
  if(!Number.isInteger(limit)||limit<1||limit>100||!['all','active','archived'].includes(archived))throw Error('Invalid catalog pagination');
  const hash=createHash('sha256').update(JSON.stringify({project:projectId===undefined?{all:true}:{id:projectId},archived})).digest('hex');
  let boundary;
  if(cursor){
   try{boundary=JSON.parse(Buffer.from(cursor,'base64url').toString());}catch{throw Error('Invalid catalog cursor');}
   if(boundary.hash!==hash||!Number.isInteger(boundary.at)||typeof boundary.id!=='string')throw Error('Catalog cursor does not match filters');
  }
  const rows=(await this.snapshot()).conversations.filter(t=>(projectId===undefined||t.projectId===projectId)&&(archived==='all'||t.archived===(archived==='archived')));
  const eligible=boundary?rows.filter(t=>t.updatedAt<boundary.at||(t.updatedAt===boundary.at&&t.id<boundary.id)):rows;
  const conversations=eligible.slice(0,limit),last=conversations.at(-1),hasMore=eligible.length>limit;
  return {conversations,total:rows.length,page:{hasMore,nextCursor:hasMore?Buffer.from(JSON.stringify({hash,at:last.updatedAt,id:last.id})).toString('base64url'):null},scope:'Local indexed Codex main conversations; excludes cloud, ChatGPT, subagents and deleted/unindexed records',snapshotAt:new Date().toISOString(),historyIsUntrustedContent:true};
 }
}
