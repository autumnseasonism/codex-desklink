import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {Duplex} from 'node:stream';
import WebSocket from 'ws';

// Use only project RPCs and creation of a new thread on the existing daemon. Never start a second daemon,
// edit the desktop database/settings, or expose arbitrary RPC execution.
export class ProjectClient {
 constructor(config){this.config=config;this.pending=new Map();this.seq=0;this.connecting=null;}
 async connect(){
  if(this.ws?.readyState===WebSocket.OPEN)return;
  if(this.connecting)return this.connecting;
  this.connecting=this.open().finally(()=>{this.connecting=null;});return this.connecting;
 }
 async open(){
  const c=this.config;
  if(!c.projectServerPath||!c.projectSocketPath)throw Error('Project integration is not configured');
  if(!fs.statSync(c.projectServerPath).isFile())throw Error('The running project daemon is unavailable');
  const child=spawn(c.projectServerPath,['app-server','proxy','--sock',c.projectSocketPath],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  this.child=child;child.stderr.on('data',()=>{});
  const stream=Duplex.from({readable:child.stdout,writable:child.stdin});
  stream.setTimeout=()=>stream;stream.setNoDelay=()=>stream;stream.setKeepAlive=()=>stream;
  const ws=new WebSocket('ws://localhost/',{createConnection:()=>stream,handshakeTimeout:10000});this.ws=ws;
  const fail=e=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(e);}this.pending.clear();};
  child.on('error',fail);ws.on('error',fail);ws.on('close',()=>{fail(Error('Project connection closed'));child.kill();});
  ws.on('message',bytes=>{let m;try{m=JSON.parse(bytes);}catch{return fail(Error('Invalid project response'));}const p=this.pending.get(m.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);});
  try{
   await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);child.once('error',reject);});
   await this.request('initialize',{clientInfo:{name:'codex_desklink_projects',version:'0.2.0'},capabilities:{experimentalApi:true,requestAttestation:false}});
   ws.send(JSON.stringify({method:'initialized'}));
  }catch(e){this.close();throw e;}
 }
 request(method,params){return new Promise((resolve,reject)=>{const id=++this.seq;const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Project RPC outcome uncertain: '+method));},20000);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}),e=>{if(e){clearTimeout(timer);this.pending.delete(id);reject(e);}});});}
 async call(method,params){if(!['project/list','project/read','project/create','thread/start','thread/name/set','thread/archive'].includes(method))throw Error('Project operation is not exposed');await this.connect();return this.request(method,params);}
 async create(name,rootPath,idempotencyKey){
  if(!path.isAbsolute(rootPath))throw Error('Project folder must be absolute');
  const actual=fs.realpathSync(rootPath);
  if(!fs.statSync(actual).isDirectory())throw Error('Project folder must already exist');
  const allowed=this.config.allowedProjectRoots.some(root=>{const base=fs.realpathSync(root);const relative=path.relative(base,actual);return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));});
  if(!allowed)throw Error('Project folder is outside the configured roots');
  return this.call('project/create',{name,roots:[{path:actual}],idempotencyKey});
 }
 close(){this.ws?.terminate();this.child?.kill();this.ws=null;this.child=null;}
}
