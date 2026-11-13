import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {createPublicationRunner} from '../lib/isolated-publication';
async function port(){const server=createServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const value=(server.address() as {port:number}).port;await new Promise<void>(resolve=>server.close(()=>resolve()));return value;}
test('publication worker rejects overlap, forwards authorization privately, and exits after completion',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'deuce-worker-test-')),workerFile=join(dir,'worker.mjs'),workerPort=await port();
 await writeFile(workerFile,`import {createServer} from 'node:http';createServer((req,res)=>{if(req.url==='/api/health'){res.end('ok');return;}setTimeout(()=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({status:req.headers.authorization==='Bearer test-only'?'success':'rejected',child:process.env.DEUCE_PUBLICATION_CHILD}));},80);}).listen(Number(process.env.PORT),'127.0.0.1');`);
 try{
  const run=createPublicationRunner({workerFile,port:workerPort,timeoutMs:2000});
  const first=run('Bearer test-only');assert.equal((await run('Bearer test-only')).status,503);
  const result=await first;assert.deepEqual(await result.json(),{status:'success',child:'1'});
  assert.equal(await portAvailable(workerPort),true);
 }finally{await rm(dir,{recursive:true,force:true});}
});
async function portAvailable(value:number){const server=createServer();try{await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(value,'127.0.0.1',resolve);});return true;}finally{server.close();}}
test('worker timeout stops the child and releases the busy state',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'deuce-worker-test-')),workerFile=join(dir,'worker.mjs'),workerPort=await port();
 await writeFile(workerFile,`import {createServer} from 'node:http';createServer((req,res)=>{if(req.url==='/api/health')res.end('ok');}).listen(Number(process.env.PORT),'127.0.0.1');`);
 try{const run=createPublicationRunner({workerFile,port:workerPort,timeoutMs:50});await assert.rejects(run('Bearer test-only'),/deadline/);assert.equal(await portAvailable(workerPort),true);}
 finally{await rm(dir,{recursive:true,force:true});}
});
