import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export async function demoServer({tree,dir,key,port,timeout=90000}) {
 const log=path.join(dir,'server.log');
 const output=fs.createWriteStream(log,{flags:'a'});
 const base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,[path.join(tree,'node_modules/next/dist/bin/next'),'start','-H','127.0.0.1','-p',String(port)],{
  cwd:tree,env:{...process.env,NODE_ENV:'production',SQLITE_DB_PATH:path.join(dir,'world.sqlite'),DB_ENCRYPTION_KEY:key,APP_PUBLIC_URL:base,VOICE_ENABLED:'false',DEFAULT_TEXT_PROVIDER:'',OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']
 });
 let exit=null,spawnError=null,stopTask;
 child.once('exit',(code,signal)=>{exit={code,signal};});
 child.once('error',e=>{spawnError=e;});
 for(const [stream,label]of [[child.stdout,'stdout'],[child.stderr,'stderr']])stream.on('data',chunk=>{if(!output.writableEnded)output.write(chunk);process[label].write('[demo server] '+chunk.toString());});
 const stop=()=>stopTask??=(async()=>{
  if(child.exitCode===null&&child.signalCode===null&&!spawnError){
   await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},5000);timer.unref();child.once('exit',()=>{clearTimeout(timer);resolve();});child.kill('SIGTERM');});
  }
  output.end();
 })();
 const deadline=Date.now()+timeout;
 try{
  let last='not listening';
  while(Date.now()<deadline){
   if(spawnError)throw spawnError;
   if(exit)throw Error('Demo server exited before readiness: '+JSON.stringify(exit));
   try{const r=await fetch(base+'/api/auth/providers',{signal:AbortSignal.timeout(5000)});if(r.ok){const p=await r.json();if(typeof p.version==='string'){console.log('[demo server ready]',base,'PID',child.pid,'version',p.version);return{base,log,pid:child.pid,stop};}}last='HTTP '+r.status;}catch(e){last=e.message;}
   await new Promise(r=>setTimeout(r,200));
  }
  throw Error('Demo server not ready after '+timeout+'ms: '+last+'; log '+log);
 }catch(e){await stop();throw e;}
}
