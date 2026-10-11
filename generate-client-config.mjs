import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const data={mcpServers:{codex_desktop:{type:'stdio',command:path.join(root,'runtime','node.exe'),args:[path.join(root,'server.mjs')]}}};
fs.writeFileSync(path.join(root,'claude.mcp.local.json'),JSON.stringify(data,null,2)+'\n');
console.log('Client config generated for current package location');
