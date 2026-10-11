import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

export class DesktopClient{
 constructor(config){this.config=config;this.client=null;this.transport=null;this.connecting=null;this.catalog=[];}
 async connect(){
  if(this.client)return;
  if(this.connecting)return this.connecting;
  this.connecting=this.open().finally(()=>{this.connecting=null});
  return this.connecting;
 }
 async open(){
  const env={};
  for(const k of ['PATH','Path','HOME','USERPROFILE','APPDATA','LOCALAPPDATA','SystemRoot','COMSPEC','TEMP','TMP'])if(process.env[k])env[k]=process.env[k];
  env.CODEX_APP_TOOLS_PIPE_PATH=this.config.pipePath;
  const transport=new StdioClientTransport({command:process.execPath,args:[this.config.appToolsServerPath],env,stderr:'pipe'});
  const client=new Client({name:'codex-desklink',version:'0.1.2'});
  try{
   await client.connect(transport,{timeout:15000});
   const {tools}=await client.listTools({}, {timeout:15000});
   if(!['read_thread','send_message_to_thread'].every(n=>tools.some(t=>t.name===n)))throw Error('Desktop connection does not expose the required chat tools');
   this.transport=transport;this.client=client;this.catalog=tools.map(t=>t.name);
   client.onclose=()=>{if(this.client===client){this.client=null;this.transport=null;this.catalog=[];}};
  }catch(e){await transport.close().catch(()=>{});throw e;}
 }
 async call(name,args){
  if(!['read_thread','send_message_to_thread','create_thread','list_threads','list_projects','set_thread_archived'].includes(name))throw Error('Desktop operation is not exposed by this bridge');
  await this.connect();
  if(!this.catalog.includes(name))throw Error('Desktop capability is unavailable: '+name);
  const result=await this.client.callTool({name,arguments:args,_meta:{'openai/threadId':this.config.callerThreadId}},undefined,{timeout:30000});
  const text=result.content.filter(c=>c.type==='text').map(c=>c.text).join('\n');
  if(result.isError)throw Error(text||'Desktop rejected the operation');
  try{return JSON.parse(text);}catch{throw Error('Desktop returned an unexpected result format');}
 }
 async close(){const c=this.client;this.client=null;this.catalog=[];await c?.close();}
}
