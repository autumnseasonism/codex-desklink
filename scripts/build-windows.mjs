import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const output=path.resolve(process.argv[2]||path.join(root,'dist',`codex-desklink-${pkg.version}-windows-x64`));
if(process.platform!=='win32'||process.arch!=='x64')throw Error('The Windows bundle must be built with Windows x64 Node');
if(fs.existsSync(output))throw Error('Output already exists; choose a new build folder');
if(!output.startsWith(root+path.sep))throw Error('Build output must stay inside this project');
const licenseUrl=`https://raw.githubusercontent.com/nodejs/node/${process.version}/LICENSE`;
// Reuse the checked-in license only for its exact runtime version.
// Other Node versions require a successful matching upstream download.
const cachedLicense=path.join(root,'third_party','node',process.version,'LICENSE');
let license;
if(fs.existsSync(cachedLicense))license=fs.readFileSync(cachedLicense,'utf8');
else{
 const response=await fetch(licenseUrl,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Matching Node license download failed');
 license=await response.text();
}
if(!license.includes('Permission is hereby granted'))throw Error('Unexpected Node license content');
const names=['.gitattributes','projects.mjs','setup-owned-clients.mjs','pi-owned-extension.mjs','start-pi-owned.ps1','start-claude-owned.ps1','actions.mjs','bridge.mjs','config.mjs','desktop.mjs','local-index.mjs','pi-extension.mjs','server.mjs','bridge.example.json','package.json','package-lock.json','node_modules','tests','docs','scripts','third_party','README.md','README.zh-CN.md','LICENSE','SECURITY.md','CONTRIBUTING.md','THIRD_PARTY_NOTICES.md','CHANGELOG.md','configure.ps1','configure-local.mjs','generate-client-config.mjs','install-claude.ps1','install-pi.ps1','start-claude.ps1','start-pi.ps1'];
for(const name of names)if(!fs.existsSync(path.join(root,name)))throw Error(`Missing build input: ${name}; run npm ci first`);
fs.mkdirSync(output,{recursive:true});
for(const name of names)fs.cpSync(path.join(root,name),path.join(output,name),{recursive:true,errorOnExist:true,force:false});
fs.mkdirSync(path.join(output,'runtime'));
fs.copyFileSync(process.execPath,path.join(output,'runtime','node.exe'),fs.constants.COPYFILE_EXCL);
fs.writeFileSync(path.join(output,'runtime','LICENSE'),license,{flag:'wx'});
fs.copyFileSync(path.join(root,'.gitignore'),path.join(output,'.gitignore'));
let files=0,bytes=0;
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())scan(p);else{files++;bytes+=fs.statSync(p).size;}}}
scan(output);
const manifest={name:pkg.name,version:pkg.version,builtAt:new Date().toISOString(),platform:process.platform,arch:process.arch,nodeVersion:process.version,nodeSha256:createHash('sha256').update(fs.readFileSync(path.join(output,'runtime','node.exe'))).digest('hex'),nodeLicenseSource:licenseUrl,files,bytes,containsPersonalConfig:false,containsConversation:false};
fs.writeFileSync(path.join(output,'bundle-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,...manifest}));
