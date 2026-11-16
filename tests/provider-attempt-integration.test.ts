import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {downloadCloudDetail} from '../lib/cloud-archive';

test('a retried detail persists every attempt and the next job stops at the free-plan reserve',async()=>{
 const root=await mkdtemp(join(tmpdir(),'deuce-provider-budget-')),priorRoot=process.env.DEUCE_ARCHIVE_DIR,priorKey=process.env.TENNIS_API_KEY,priorFetch=global.fetch,priorCI=process.env.CI;
 // Exercise the provider path with a mocked transport; production CI stays fail-closed.
 delete process.env.CI;
 process.env.DEUCE_ARCHIVE_DIR=root;process.env.TENNIS_API_KEY='test-only-no-network';
 let calls=0,usageChecks=0;
 global.fetch=async input=>{
  calls++;const url=String(input);
  if(url.endsWith('/usage')){
   usageChecks++;
   const remaining=usageChecks===1?13:10;
   return Response.json({today:{remaining_day:remaining,used_day:usageChecks===1?20:23,reset_at:new Date(Date.now()+3600000).toISOString()}});
  }
  if(calls===2)return Response.json({detail:'temporary unavailability'},{status:503});
  return Response.json({match:{id:'budget-test-a'}});
 };
 try{
  assert.ok(await downloadCloudDetail('modern','budget-test-a'));
  assert.equal(calls,3);
  const state=JSON.parse(await readFile(join(root,'provider-attempt-budget.json'),'utf8'));
  assert.equal(state.attempts,3);assert.equal(state.remaining,11);
  assert.equal(await downloadCloudDetail('modern','budget-test-b'),undefined);
  assert.equal(calls,4,'only the usage check runs; provider details stop at the reserve');
 }finally{
  global.fetch=priorFetch;
  if(priorCI===undefined)delete process.env.CI;else process.env.CI=priorCI;
  if(priorRoot===undefined)delete process.env.DEUCE_ARCHIVE_DIR;else process.env.DEUCE_ARCHIVE_DIR=priorRoot;
  if(priorKey===undefined)delete process.env.TENNIS_API_KEY;else process.env.TENNIS_API_KEY=priorKey;
  await rm(root,{recursive:true,force:true});
 }
});
