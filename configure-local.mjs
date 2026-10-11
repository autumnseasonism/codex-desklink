import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadConfig} from './config.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const [id,pipe,all,send]=process.argv.slice(2);
if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id||''))throw Error('A verified Codex thread UUID is required');
if(!/^\\\\\.\\pipe\\codex-browser-use-[a-zA-Z0-9-]+$/.test(pipe||''))throw Error('A verified local Codex pipe is required');
const target=path.join(root,'bridge.local.json');
const temp=path.join(root,`.config-${Date.now()}-${process.pid}.json`);
const next={callerThreadId:id,allowedThreadIds:[id],allowedProjectIds:[],allowSend:send==='True',allowCreate:false,allowProjectlessCreate:false,allowAllLocalConversations:all==='True',pipePath:pipe};
// Validate before touching an existing configuration; keep its complete backup.
fs.writeFileSync(temp,JSON.stringify(next,null,2)+'\n',{flag:'wx'});
try{loadConfig(temp);if(fs.existsSync(target)){const bytes=fs.readFileSync(target);const dir=path.join(root,'recovery');fs.mkdirSync(dir,{recursive:true});const backup=path.join(dir,`bridge-before-${Date.now()}-${process.pid}.json`);fs.writeFileSync(backup,bytes,{flag:'wx'});if(!fs.readFileSync(backup).equals(bytes))throw Error('Configuration backup mismatch');}fs.renameSync(temp,target);console.log(JSON.stringify({bound:true,allLocal:next.allowAllLocalConversations,send:next.allowSend,create:false}));}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
