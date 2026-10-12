import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
export default function(pi){
 const runtime=fileURLToPath(new URL('./runtime/node.exe',import.meta.url));
 const config=fileURLToPath(new URL('./profiles/pi.json',import.meta.url));
 if(!fs.existsSync(config))throw Error('Configure the client-owned profiles first');
 pi.registerMcpServer('codex_desktop',{command:fs.existsSync(runtime)?runtime:process.execPath,args:[fileURLToPath(new URL('./server.mjs',import.meta.url))],env:{CODEX_DESKTOP_BRIDGE_CONFIG:config},exposure:'direct',timeout:60,description:'PI-owned Codex chats: first create_conversation, then create_project/create_conversation/read/continue/result. All features enabled; only PI-owned chats can be controlled. Never retry uncertain writes.'});
}
