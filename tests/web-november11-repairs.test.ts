import test from 'node:test';
import assert from 'node:assert/strict';
import rows from '../lib/verified-web-2026-11-11.json';
import {editionReferenceMatches} from '../lib/verified-editions';
import {prepareMatch,eligibleMatch} from '../lib/quality';

test('each new repair has three distinct source hosts and a unique circuit-scoped identity',()=>{
 const ids=new Set();
 for(const row of rows){
  const id=[row.tour,row.tournament,row.year,row.round,[row.first,row.second].sort().join('|')].join(':');
  assert.ok(!ids.has(id),id);ids.add(id);
  const hosts=new Set([row.source,row.corroboration,...row.evidence].map(url=>new URL(url).hostname.replace(/^www\./,'')));
  assert.ok(hosts.size>=3,`${row.id}: fewer than three source hosts`);
  assert.ok(row.year>=2023&&row.year<=2026);
 }
});
test('walkovers fill the draw without invented sets, points or played wins',()=>{
 for(const row of rows.filter(r=>r.status==='Walkover')){
  const match=editionReferenceMatches.find(m=>m.match_id==='reference-'+row.id)!;
  assert.ok(match,row.id);assert.equal(match.tour,row.tour);
  assert.equal(match.final_score,'');assert.deepEqual(match.score_summary.games,[]);
  assert.deepEqual(match.point_tape,[]);assert.deepEqual(match.statistics,[]);
  assert.equal(eligibleMatch(prepareMatch(match)),false);
  assert.ok((match.context?.metadataSources?.length||0)>=2);
 }
 const played=editionReferenceMatches.find(m=>m.match_id==='reference-str24-keys-samsonova-sf')!;
 assert.equal(eligibleMatch(prepareMatch(played)),true);
 assert.deepEqual(played.score_summary.games,[[6,1],[6,3]]);
});

test('every completed repair parses its sets and is eligible for recalculation',()=>{
 for(const row of rows.filter(r=>r.status==='Finished')){
  const match=editionReferenceMatches.find(m=>m.match_id==='reference-'+row.id)!;
  assert.ok(eligibleMatch(prepareMatch(match)),row.id);
  assert.ok(match.score_summary.games.length>=2,row.id);
 }
 const retired=editionReferenceMatches.find(m=>m.match_id==='reference-mon24-kartal-lys-ret')!;
 assert.equal(retired.status,'Retired');assert.deepEqual(retired.score_summary.games,[[5,1]]);
 assert.equal(eligibleMatch(prepareMatch(retired)),true);
});
