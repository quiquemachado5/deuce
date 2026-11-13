import 'server-only';
import {spawn} from 'node:child_process';
import {request as httpRequest} from 'node:http';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';

/** One short-lived worker; no second permanent web process or paid service. */
export function createPublicationRunner(options:{workerFile?:string;port?:number;timeoutMs?:number}={}){
 let running=false;
 const port=options.port||3001,timeoutMs=options.timeoutMs||720_000;
 function call(path:string,authorization?:string,timeout=timeoutMs):Promise<{status:number;body:Buffer}>{
  return new Promise((resolve,reject)=>{
   const req=httpRequest({hostname:'127.0.0.1',port,path,method:'GET',headers:authorization?{authorization}:{}},res=>{
    const chunks:Buffer[]=[];let size=0;
    res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>2_000_000)req.destroy(new Error('Publication response exceeds budget'));else chunks.push(chunk);});
    res.on('end',()=>resolve({status:res.statusCode||502,body:Buffer.concat(chunks)}));res.on('error',reject);
   });
   const deadline=setTimeout(()=>req.destroy(new Error('Publication worker deadline exceeded')),timeout);
   req.on('close',()=>clearTimeout(deadline));req.on('error',reject);req.end();
  });
 }
 return async function run(authorization:string){
  if(running)return Response.json({status:'busy',error:'Publication worker is already running'},{status:503});
  running=true;
  try{await new Promise<void>((resolve,reject)=>{const probe=createServer();probe.once('error',reject);probe.listen(port,'127.0.0.1',()=>probe.close(error=>error?reject(error):resolve()));});}
  catch(error){running=false;throw new Error('Publication worker port is unavailable',{cause:error});}
  const child=spawn(process.execPath,[options.workerFile||join(process.cwd(),'server.js')],{
   env:{...process.env,HOSTNAME:'127.0.0.1',PORT:String(port),DEUCE_PUBLICATION_CHILD:'1'},stdio:['ignore','inherit','inherit'],
  });
  let failure:Error|undefined;child.once('error',error=>{failure=error;});
  const exited=new Promise<void>(resolve=>{child.once('exit',()=>resolve());child.once('error',()=>resolve());});
  try{
   const deadline=Date.now()+30_000;
   for(;;){
    if(failure||child.exitCode!==null)throw failure||new Error('Publication worker exited before readiness');
    const ready=await call('/api/health',undefined,2000).catch(()=>null);
    if(ready?.status===200)break;
    if(Date.now()>=deadline)throw new Error('Publication worker did not become ready');
    await delay(250);
   }
   const result=await call('/api/cron/publish',authorization);
   return new Response(new Uint8Array(result.body),{status:result.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }finally{
   child.kill('SIGTERM');
   const timer=setTimeout(()=>child.kill('SIGKILL'),5000);timer.unref();
   await exited;clearTimeout(timer);running=false;
  }
 };
}
export const runIsolatedPublication=createPublicationRunner();
