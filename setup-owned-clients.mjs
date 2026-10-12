import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadConfig} from './config.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const [bootstrapThreadId,pipePath,projectRoot,projectServerPath,projectSocketPath]=process.argv.slice(2);
if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(bootstrapThreadId||''))throw Error('Verified bootstrap thread UUID required');
if(!path.isAbsolute(projectRoot||'')||!fs.statSync(projectRoot).isDirectory())throw Error('Existing authorized project root required');
const profiles=path.join(root,'profiles');
for(const file of ['pi.json','claude.json','claude.mcp.json'])if(fs.existsSync(path.join(profiles,file)))throw Error('Owned profiles already exist; preserve their ownership state and inspect before changing');
fs.mkdirSync(profiles,{recursive:true});

try{
 for(const clientId of ['pi','claude']){
  const file=path.join(profiles,`${clientId}.json`);
  const config={callerThreadId:bootstrapThreadId,allowedThreadIds:[bootstrapThreadId],allowedProjectIds:[],allowSend:true,allowCreate:true,allowProjectlessCreate:true,allowAllLocalConversations:true,clientId,ownedConversationsOnly:true,allowExistingConversationControl:true,allowProjectCreate:true,allowedProjectRoots:[fs.realpathSync(projectRoot)],projectServerPath,projectSocketPath,pipePath,stateDir:path.join(profiles,'state')};
  fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n',{flag:'wx'});loadConfig(file);
 }
 const command=fs.existsSync(path.join(root,'runtime','node.exe'))?path.join(root,'runtime','node.exe'):process.execPath;
 fs.writeFileSync(path.join(profiles,'claude.mcp.json'),JSON.stringify({mcpServers:{codex_desktop:{type:'stdio',command,args:[path.join(root,'server.mjs')],env:{CODEX_DESKTOP_BRIDGE_CONFIG:path.join(profiles,'claude.json')}}}},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({configured:true,clients:['pi','claude'],features:{send:true,createConversation:true,createProject:true,read:true,result:true,existingConversationControl:true},requiresCreateFirst:true,projectRoot:fs.realpathSync(projectRoot),legacyConfigurationUnchanged:true}));
}catch(e){throw Error('Setup incomplete; preserve and inspect profiles before retrying: '+e.message);}
