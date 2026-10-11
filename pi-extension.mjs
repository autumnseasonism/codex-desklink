import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
// Session-scoped registration: does not overwrite PI's personal MCP config.
export default function(pi){
 const bundledNode=fileURLToPath(new URL('./runtime/node.exe',import.meta.url));
 pi.registerMcpServer('codex_desktop',{command:fs.existsSync(bundledNode)?bundledNode:process.execPath,args:[fileURLToPath(new URL('./server.mjs',import.meta.url))],exposure:'direct',timeout:60,description:'List local Codex projects/chats and read or continue user-authorized conversations. Respect configured scope; use small catalog pages (20) to avoid client output truncation.'});
}
