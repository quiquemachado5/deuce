import test from 'node:test';
import assert from 'node:assert/strict';
import {mockMatches} from '../lib/mocks';
import {compileRecordSnapshot} from '../lib/revista/snapshot';
import {assertReleaseCoverage} from '../lib/revista/release-check';
import {measurementCorrections} from '../lib/revista/release-source';
import type {Match} from '../lib/types';
const previous:Match={...mockMatches[0],match_id:'live-review',tour:'atp',data_source:'api',context:{format:'BO3'},point_tape:[],statistics:([
 [1,'Points played',140],[2,'Points played',140],[1,'Total points won',71],[2,'Total points won',69],
] as const).map(([player,name,value])=>({player,name,value:String(value),period:'match',category:'Points',won:null,total:null}))};
const clean:Match={...previous,statistics:[],context:{...previous.context,pointSource:'reconstructed',derivationVersion:'2026-11-finals-v2'},raw_fixture:{meta:{point_source:'reconstructed'}}};
const manifest=(match:Match)=>compileRecordSnapshot([match],new Date('2026-11-13')).manifest;
test('explicit provider reclassification retires only its reconstructed measurements, never matches',()=>{
 const corrections=measurementCorrections([previous],[clean]);assert.equal(corrections.length,1);
 const before=manifest(previous),after=compileRecordSnapshot([clean],new Date(),[],[],before).manifest;
 assert.throws(()=>assertReleaseCoverage(before,after),/measured coverage/);
 assert.doesNotThrow(()=>assertReleaseCoverage(before,after,[],corrections));
 assert.throws(()=>assertReleaseCoverage(before,{...after,matchCount:0},[],corrections),/lose published matches/);
 const extra=manifest({...previous,match_id:'other'});
 const inflated={...before,pieces:before.pieces.map(row=>row.measured?{...row,sample:row.sample+1}:row)};
 assert.throws(()=>assertReleaseCoverage(inflated,after,[],corrections),/measured coverage/);
 assert.ok(extra.matchCount);
});
test('missing raw evidence, a different score, duplicate reviews and loss of measured aces fail closed',()=>{
 assert.equal(measurementCorrections([previous],[{...clean,raw_fixture:undefined}]).length,0);
 assert.equal(measurementCorrections([previous],[{...clean,winner:previous.winner===1?2:1}]).length,0);
 const corrections=measurementCorrections([previous],[clean]);
 assert.throws(()=>assertReleaseCoverage(manifest(previous),manifest(clean),[],[...corrections,...corrections]),/Unverified measurement/);
 const aces={...previous,statistics:[...previous.statistics,{player:1 as const,name:'Aces',value:'5',period:'match',category:'Service',won:5,total:null}]};
 assert.equal(measurementCorrections([aces],[clean]).length,0);
});

test('compact review evidence retains the provider labels and omits the tape and other raw data',async()=>{
 const {reconstructedEvidence,isReconstructedDetail}=await import('../lib/reconstructed-evidence');
 const evidence=reconstructedEvidence({meta:{coverage:'mixed'},tape:[{origin:'reconstructed',payload:'private'},{origin:'reconstructed'}],unrelated:'omitted'});
 assert.equal(isReconstructedDetail(evidence),true);
 assert.equal(JSON.stringify(evidence).includes('private'),false);
 assert.equal(JSON.stringify(evidence).includes('unrelated'),false);
 assert.equal(reconstructedEvidence({meta:{coverage:'observed'}}),undefined);
});

test('a retired source leaves an empty record definition, never an old leader or statistic',async()=>{
 const before=manifest(previous),snapshot=compileRecordSnapshot([clean],new Date(),[],[],before);
 const empty=snapshot.manifest.pieces.find(row=>row.id==='total-points');
 assert.equal(empty?.sample,0);assert.equal(empty?.total,0);assert.equal(empty?.leader,undefined);
 assert.deepEqual(Object.values(snapshot.pieces['total-points'].pages).flat(),[]);
 assert.doesNotThrow(()=>assertReleaseCoverage(before,snapshot.manifest,[],measurementCorrections([previous],[clean])));
});

test('coverage reviews count measured matches even when none qualifies for the record itself',()=>{
 const ordinary={...previous,winner:1 as const};
 const reviewed={...clean,winner:1 as const};
 const genuine={...previous,match_id:'genuine',winner:1 as const,statistics:previous.statistics.map(s=>s.name==='Total points won'?{...s,value:s.player===1?'60':'80'}:s)};
 const before=compileRecordSnapshot([ordinary,genuine]).manifest,after=compileRecordSnapshot([reviewed,genuine]).manifest;
 assert.throws(()=>assertReleaseCoverage(before,after),/measured coverage/);
 assert.doesNotThrow(()=>assertReleaseCoverage(before,after,[],measurementCorrections([ordinary],[reviewed])));
});

test('a record with no qualifying result retains the true remaining measurement sample',()=>{
 const ordinary={...previous,winner:1 as const},reviewed={...clean,winner:1 as const};
 const derived={...ordinary,statistics:ordinary.statistics.map(s=>s.name==='Total points won'?{...s,value:s.player===1?'60':'80'}:s)};
 const genuine={...ordinary,match_id:'genuine'};
 const before=compileRecordSnapshot([derived,genuine]).manifest;
 const snapshot=compileRecordSnapshot([reviewed,genuine],new Date(),[],[],before);
 assert.equal(snapshot.manifest.pieces.find(row=>row.id==='ganar-con-menos-puntos')?.sample,1);
 assert.doesNotThrow(()=>assertReleaseCoverage(before,snapshot.manifest,[],measurementCorrections([derived],[reviewed])));
});


test('new measurements on another reviewed match never cancel a verified source retirement',()=>{
 const fraction={player:previous.winner!,name:'Break points saved',value:'2/3',period:'match',category:'Return',won:2,total:3};
 const lost={...previous,statistics:[...previous.statistics,fraction]};
 const gainedBefore={...previous,match_id:'new-measurement',statistics:[]};
 const gainedAfter={...clean,match_id:'new-measurement',statistics:[fraction]};
 const lostAgain={...lost,match_id:'second-retirement'},cleanAgain={...clean,match_id:'second-retirement'};
 const before=compileRecordSnapshot([lost,lostAgain,gainedBefore]).manifest;
 const after=compileRecordSnapshot([clean,cleanAgain,gainedAfter],new Date(),[],[],before).manifest;
 assert.doesNotThrow(()=>assertReleaseCoverage(before,after,[],measurementCorrections([lost,lostAgain,gainedBefore],[clean,cleanAgain,gainedAfter])));
 const inflated={...before,pieces:before.pieces.map(row=>row.id==='breaks-salvados-victoria'?{...row,sample:row.sample+2}:row)};
 assert.throws(()=>assertReleaseCoverage(inflated,after,[],measurementCorrections([lost,lostAgain,gainedBefore],[clean,cleanAgain,gainedAfter])),/measured coverage/);
});


test('subsequent publications use corrected active coverage without historical waivers',()=>{
 const bundled=manifest(previous);
 const active=compileRecordSnapshot([clean],new Date(),[],[],bundled).manifest;
 assert.doesNotThrow(()=>assertReleaseCoverage(bundled,active,[],measurementCorrections([previous],[clean])));
 const next=compileRecordSnapshot([clean],new Date(),[],[],active).manifest;
 assert.equal(measurementCorrections([clean],[clean]).length,0);
 assert.throws(()=>assertReleaseCoverage(bundled,next),/measured coverage/);
 assert.doesNotThrow(()=>assertReleaseCoverage(active,next));
 assert.throws(()=>assertReleaseCoverage(active,{...next,matchCount:0}),/lose published matches/);
});
