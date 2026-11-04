import assert from 'node:assert/strict';
import test from 'node:test';
import { dailyUpdateFresh, dailyUpdateIssue, restoreValidationEvidence } from '../lib/operational-health';

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
