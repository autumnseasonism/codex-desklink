import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';

export const packageDir=path.dirname(fileURLToPath(import.meta.url));
const schema=z.object({
 callerThreadId:z.string().min(1),
 allowedThreadIds:z.array(z.string().min(1)).min(1),
 allowedProjectIds:z.array(z.string().min(1)).default([]),
 allowSend:z.boolean().default(false),
 allowCreate:z.boolean().default(false),
 allowProjectlessCreate:z.boolean().default(false),
 allowAllLocalConversations:z.boolean().default(false),
 clientId:z.enum(['pi','claude']).optional(),
 ownedConversationsOnly:z.boolean().default(false),
 allowProjectCreate:z.boolean().default(false),
 allowedProjectRoots:z.array(z.string().min(1)).default([]),
 projectServerPath:z.string().optional(),
 projectSocketPath:z.string().optional(),
 localCodexHome:z.string().optional(),
 pipePath:z.string().regex(/^\\\\\.\\pipe\\codex-browser-use-[a-zA-Z0-9-]+$/),
 appToolsServerPath:z.string().optional(),
 stateDir:z.string().optional()
}).strict();

export function loadConfig(file=process.env.CODEX_DESKTOP_BRIDGE_CONFIG||path.join(packageDir,'bridge.local.json')){
 const config=schema.parse(JSON.parse(fs.readFileSync(file,'utf8')));
 if(!config.allowedThreadIds.includes(config.callerThreadId))throw Error('callerThreadId must be an explicitly authorized conversation');
 if(config.ownedConversationsOnly&&!config.clientId)throw Error('Owned mode requires a client identity');
 if(config.allowProjectCreate&&(!config.ownedConversationsOnly||!config.projectServerPath||!config.projectSocketPath||!config.allowedProjectRoots.length))throw Error('Project creation requires owned mode, daemon connection and allowed roots');
 config.stateDir=path.resolve(config.stateDir||path.join(path.dirname(path.resolve(file)),'state'));
 if(config.ownedConversationsOnly)config.stateDir=path.join(config.stateDir,'clients',config.clientId);
 config.localCodexHome=path.resolve(config.localCodexHome||process.env.CODEX_HOME||path.join(os.homedir(),'.codex'));
 config.appToolsServerPath=config.appToolsServerPath||findBundledServer();
 if(!fs.statSync(config.appToolsServerPath).isFile())throw Error('Codex desktop tools server is unavailable');
 return config;
}

function findBundledServer(){
 const base=path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'plugins/cache/openai-bundled/codex-app-tools');
 const versions=fs.readdirSync(base).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
 const found=versions.map(v=>path.join(base,v,'server.mjs')).find(p=>fs.existsSync(p));
 if(!found)throw Error('Bundled codex-app-tools was not found; configure appToolsServerPath');
 return found;
}
