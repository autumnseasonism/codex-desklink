import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

// Persist intent before submission. An interrupted or timed-out write is never
// automatically retried: the desktop may already have accepted it.
export class ActionLedger{
 constructor(directory){this.directory=directory;}
 async run(requestId,payload,action){
  if(!/^[a-zA-Z0-9_-]{8,80}$/.test(requestId))throw Error('requestId must contain 8–80 letters, digits, underscores or hyphens');
  fs.mkdirSync(this.directory,{recursive:true});
  const digest=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const file=path.join(this.directory,createHash('sha256').update(requestId).digest('hex')+'.json');
  const intent={digest,status:'pending',createdAt:new Date().toISOString()};
  try{fs.writeFileSync(file,JSON.stringify(intent),{flag:'wx'});}
  catch(e){
   if(e.code!=='EEXIST')throw e;
   const previous=JSON.parse(fs.readFileSync(file,'utf8'));
   if(previous.digest!==digest)throw Error('requestId was already used for different input');
   if(previous.status==='accepted')return {...previous.result,replayed:true};
   throw Error('Previous submission is pending or uncertain. Read the conversation before deciding whether to send a new request; do not retry automatically.');
  }
  try{
   const result=await action();this.save(file,{...intent,status:'accepted',result});return result;
  }catch(e){this.save(file,{...intent,status:'uncertain'});throw e;}
 }
 save(file,value){const temp=file+'.'+randomUUID()+'.tmp';fs.writeFileSync(temp,JSON.stringify(value),{flag:'wx'});fs.renameSync(temp,file);}
}
