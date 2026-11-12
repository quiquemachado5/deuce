import test from 'node:test';import assert from 'node:assert/strict';
import{mkdtempSync,rmSync,writeFileSync,statSync}from'node:fs';import{tmpdir}from'node:os';import{join,resolve}from'node:path';import{execFile}from'node:child_process';import{promisify}from'node:util';import{DatabaseSync}from'node:sqlite';
import{sharedRateLimit,sharedRateLimitPath,closeSharedRateLimitHandles,sharedRateLimitDiagnostics}from'../lib/shared-rate-limit';
const exec=promisify(execFile);

test('atomic SQLite budgets are shared by concurrent independent Node workers',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'deuce-limits-')),path=join(directory,'shared.sqlite');
 try{
  // Initialize once as production does on its first request; each child has a distinct module/process cache.
  assert.equal(sharedRateLimit(path,'warmup',100,60000,1000).allowed,true);closeSharedRateLimitHandles();
  const modulePath=resolve('lib/shared-rate-limit.ts');
  const code=`import {sharedRateLimit} from ${JSON.stringify(modulePath)}; let allowed=0;for(let i=0;i<12;i++)allowed+=Number(sharedRateLimit(process.argv[1],'search:203.0.113.8',17,60000,1000).allowed);console.log(allowed)`;
  const results=await Promise.all(Array.from({length:4},()=>exec(process.execPath,['--import',resolve('build/register.mjs'),'--import','tsx','--input-type=module','-e',code,path],{cwd:process.cwd()})));
  assert.equal(results.reduce((n,r)=>n+Number(r.stdout.trim()),0),17);
  assert.equal(sharedRateLimit(path,'search:203.0.113.8',17,60000,1001).allowed,false);
  closeSharedRateLimitHandles(); // Restarting a worker must not reset the shared window.
  assert.equal(sharedRateLimit(path,'search:203.0.113.8',17,60000,1002).allowed,false);
  assert.equal(sharedRateLimit(path,'search:203.0.113.8',17,60000,61000).remaining,16);
  assert.equal(statSync(path).mode&0o777,0o600);
 }finally{closeSharedRateLimitHandles();rmSync(directory,{recursive:true,force:true});}
});

test('corrupt, missing shared configuration and contended stores fail closed without fallback',()=>{
 const directory=mkdtempSync(join(tmpdir(),'deuce-limits-')),path=join(directory,'broken.sqlite');
 try{
  writeFileSync(path,'not sqlite');assert.equal(sharedRateLimit(path,'actor',10,60000).allowed,false);assert.ok(sharedRateLimitDiagnostics(path).failures>=1);closeSharedRateLimitHandles();
  rmSync(path);assert.equal(sharedRateLimit(path,'actor',10,60000).allowed,true);
  const other=new DatabaseSync(path);other.exec('BEGIN IMMEDIATE');
  try{const start=performance.now();assert.equal(sharedRateLimit(path,'actor',10,60000).allowed,false);assert.ok(performance.now()-start<500);}finally{other.exec('ROLLBACK');other.close();}
  assert.equal(sharedRateLimit('relative.sqlite','actor',10,60000).allowed,false);
  assert.equal(sharedRateLimitPath({DEUCE_ARCHIVE_DIR:'/shared/archive'}),'/shared/archive/.runtime/rate-limits.sqlite');
  assert.equal(sharedRateLimitPath({}),undefined);
 }finally{closeSharedRateLimitHandles();rmSync(directory,{recursive:true,force:true});}
});

test('expired cleanup and fixed storage capacity cannot evict active actors to bypass budgets',()=>{
 const directory=mkdtempSync(join(tmpdir(),'deuce-limits-')),path=join(directory,'limited.sqlite');
 try{
  sharedRateLimit(path,'existing',1,60000,1000);const db=new DatabaseSync(path);
  const insert=db.prepare('INSERT INTO buckets(key,count,reset_at) VALUES (?,1,61000)');db.exec('BEGIN');for(let i=0;i<32767;i++)insert.run(`seed-${i}`);db.exec('COMMIT');db.close();
  assert.equal(sharedRateLimit(path,'new',1,60000,1001).allowed,false);
  assert.equal(sharedRateLimit(path,'existing',1,60000,1001).allowed,false);
  assert.equal(sharedRateLimitDiagnostics(path).entries,32768);
  assert.equal(sharedRateLimit(path,'new',1,60000,62000).allowed,true);
  assert.equal(sharedRateLimitDiagnostics(path).entries,32768-1024+1);
 }finally{closeSharedRateLimitHandles();rmSync(directory,{recursive:true,force:true});}
});
