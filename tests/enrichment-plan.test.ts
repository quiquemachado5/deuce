import assert from 'node:assert/strict';
import test from 'node:test';
import { detailCandidateKey, enrichmentPlan, type DetailCandidate } from '../lib/enrichment-plan';

const row=(tour:'atp'|'wta',kind:'archive'|'modern',id:string,round='F'):DetailCandidate=>({tour,kind,id,round,year:kind==='archive'?2022:2026});

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

test('detail enrichment de-duplicates circuit-aware keys',()=>{
  const duplicate=row('wta','archive','9');
  assert.deepEqual(enrichmentPlan([duplicate,duplicate,row('atp','archive','9')],new Set(),10).map(detailCandidateKey),[
    'archive-9','wta-archive-9',
  ]);
});
