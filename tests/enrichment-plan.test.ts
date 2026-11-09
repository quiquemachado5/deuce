import assert from 'node:assert/strict';
import test from 'node:test';
import { detailCandidateKey, detailMatchesCandidate, enrichmentPlan, statisticsCheckDue, statisticsEnrichmentPlan, type DetailCandidate } from '../lib/enrichment-plan';
import {completeEnrichment,deferEnrichment,enrichmentQueueCounts,persistentEnrichmentPlan,readEnrichmentQueue} from '../lib/enrichment-queue';

const row=(tour:'atp'|'wta',kind:'archive'|'modern',id:string,round='F'):DetailCandidate=>({tour,kind,id,round,year:kind==='archive'?2022:2026,players:['Player One','Player Two']});

test('detail enrichment rotates ATP, WTA, archive and modern queues',()=>{
  const candidates=[
    row('atp','archive','1'),row('wta','archive','1'),row('atp','modern','2'),row('wta','modern','2'),
    row('atp','archive','3','R32'),row('wta','archive','3','R32'),
  ];
  assert.deepEqual(enrichmentPlan(candidates,new Set(),4).map(detailCandidateKey),[
    'archive-1','wta-archive-1','modern-2','wta-modern-2',
  ]);
  assert.deepEqual(enrichmentPlan(candidates,new Set(['wta-archive-1']),4).map(detailCandidateKey),[
    'archive-1','wta-archive-3','modern-2','wta-modern-2',
  ]);
});

test('detail responses must match the requested identity, participants and circuit',()=>{
  const candidate=row('wta','modern','42');
  const valid={match:{id:42,tour:'challenger',gender:'women',players:{p1:{name:'Player Two',tour:'wta'},p2:{name:'Player One',tour:'wta'}}}};
  assert.equal(detailMatchesCandidate(candidate,valid),true);
  assert.equal(detailMatchesCandidate(candidate,{match:{...valid.match,id:43}}),false);
  assert.equal(detailMatchesCandidate(candidate,{match:{...valid.match,players:{p1:{name:'Other'},p2:{name:'Player One'}}}}),false);
  assert.equal(detailMatchesCandidate(candidate,{match:{...valid.match,players:{p1:{name:'Player Two',tour:'atp'},p2:{name:'Player One',tour:'wta'}}}}),false);
  assert.equal(detailMatchesCandidate(candidate,{match:{...valid.match,gender:'men'}}),false);
});

test('detail enrichment de-duplicates circuit-aware keys',()=>{
  const duplicate=row('wta','archive','9');
  assert.deepEqual(enrichmentPlan([duplicate,duplicate,row('atp','archive','9')],new Set(),10).map(detailCandidateKey),[
    'archive-9','wta-archive-9',
  ]);
});

test('unavailable details are durably deferred and later retried',()=>{
  const candidate=row('wta','archive','missing');
  const now=Date.parse('2026-11-04T00:00:00.000Z');
  let state=deferEnrichment(readEnrichmentQueue(undefined),candidate,'unavailable',now);
  assert.deepEqual(persistentEnrichmentPlan([candidate],new Set(),state,10,now+86_400_000),[]);
  assert.equal(enrichmentQueueCounts([candidate],new Set(),state,now+86_400_000).deferred,1);
  assert.equal(persistentEnrichmentPlan([candidate],new Set(),state,10,now+31*86_400_000).length,1);
  state=completeEnrichment(state,candidate,now+31*86_400_000);
  assert.equal(Object.keys(state.deferred).length,0);
});

test('statistics enrichment alternates circuits and retries stale empty responses',()=>{
  const now=Date.parse('2026-11-09T00:00:00.000Z');
  const candidates=[row('atp','modern','1'),row('atp','modern','2','R32'),row('wta','modern','3'),row('wta','modern','4','QF')];
  const known=new Set(candidates.map(detailCandidateKey));
  const checked={
    'modern-1':'present',
    'wta-modern-3':'empty@2026-11-08T00:00:00.000Z',
    'wta-modern-4':'empty@2026-09-01T00:00:00.000Z',
  };
  assert.deepEqual(statisticsEnrichmentPlan(candidates,known,checked,4,now).map(detailCandidateKey),['modern-2','wta-modern-4']);
  assert.equal(statisticsCheckDue(checked['wta-modern-3'],now),false);
  assert.equal(statisticsCheckDue(checked['wta-modern-4'],now),true);
});
