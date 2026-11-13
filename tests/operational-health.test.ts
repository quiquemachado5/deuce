import assert from 'node:assert/strict';
import test from 'node:test';
import { dailyUpdateFresh, dailyUpdateIssue, publicationRefreshCheckpoint, publicationRefreshReady, restoreValidationEvidence } from '../lib/operational-health';

test('publication reuses a recent successful checkpoint after a quota pause only',()=>{
  const now=Date.parse('2026-11-13T17:00:00Z');
  const fresh='2026-11-13T14:00:00Z';
  assert.equal(publicationRefreshReady({status:'success',at:fresh},now),true);
  assert.equal(publicationRefreshReady({status:'quota-reserve',lastSuccessAt:fresh},now),true);
  assert.equal(publicationRefreshReady({status:'free-history-limit',lastSuccessAt:fresh},now),true);
  for(const status of ['running','error','quota-reserve']){
    assert.equal(publicationRefreshReady({status,at:fresh},now),false);
  }
  assert.equal(publicationRefreshReady({status:'error',lastSuccessAt:fresh},now),false);
  assert.equal(publicationRefreshReady({status:'quota-reserve',lastSuccessAt:'2026-11-11T14:00:00Z'},now),false);
  assert.equal(publicationRefreshReady({status:'success',at:'2026-11-14T14:00:00Z'},now),false);
  assert.equal(publicationRefreshReady(undefined,now),false);
});

test('a quota pause uses the matching successful provider extent, never a partial attempt',()=>{
  const now=Date.parse('2026-11-13T17:00:00Z');
  const complete={status:'success',at:'2026-11-13T14:00:00Z',latestProviderDate:'2026-11-12'};
  const pause={status:'quota-reserve',at:'2026-11-13T15:00:00Z',lastSuccessAt:complete.at,history:[complete,{status:'error',at:'2026-11-13T15:00:00Z',latestProviderDate:'2026-11-13'}]};
  assert.equal(publicationRefreshCheckpoint(pause,now),complete);
  assert.equal(publicationRefreshCheckpoint({...pause,history:[]},now),undefined);
  assert.equal(publicationRefreshCheckpoint({...pause,status:'error'},now),undefined);
  assert.equal(publicationRefreshCheckpoint({...pause,lastSuccessAt:'2026-11-13T13:00:00Z'},now),undefined);
  assert.equal(publicationRefreshCheckpoint(complete,now),complete);
});

test('fresh protected quota deferrals do not report a failed daily update',()=>{
  assert.equal(dailyUpdateFresh({status:'quota-reserve',ageHours:1,lastSuccessAgeHours:2}),true);
  assert.equal(dailyUpdateFresh({status:'free-history-limit',lastSuccessAgeHours:35.9}),true);
  assert.equal(dailyUpdateIssue([
    {status:'success',ageHours:1},
    {status:'quota-reserve',lastSuccessAgeHours:2},
    {status:'success',ageHours:3},
  ]),false);
});

test('stale deferrals and genuine failures still degrade health',()=>{
  assert.equal(dailyUpdateFresh({status:'quota-reserve',lastSuccessAgeHours:37}),false);
  assert.equal(dailyUpdateFresh({status:'error',lastSuccessAgeHours:1}),false);
  assert.equal(dailyUpdateIssue([{status:'success',ageHours:1},{status:'error',lastSuccessAgeHours:1}]),true);
});

test('legacy restore success is accepted only with complete cryptographic evidence',()=>{
  const legacy={status:'success',archive:'deuce-archive-20261104T030000Z.tar.gz',sha256:'a'.repeat(64),image:'deuce-web:abc',backupAt:'2026-11-04T03:00:00Z'};
  assert.equal(restoreValidationEvidence(legacy),true);
  assert.equal(restoreValidationEvidence({...legacy,sha256:'short'}),false);
  assert.equal(restoreValidationEvidence({...legacy,status:'error'}),false);
  assert.equal(restoreValidationEvidence({restoreValidated:true}),true);
});
