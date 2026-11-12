import test from 'node:test';
import assert from 'node:assert/strict';
import {clientAddress} from '../lib/client-address';
import {datasetEtag,versionedJson} from '../lib/http-cache';
import {normalizedCompactSelection} from '../lib/revista/compact-selection';
import {publishedMatches} from '../lib/publication-scope';
import {MATCH_ID_ALIASES} from '../lib/match-identity-aliases';
import {mockMatches} from '../lib/mocks';
import type {Match} from '../lib/types';
import {preservePublishedArchive} from '../lib/revista/release-source';
const result=(id:string):Match=>({...mockMatches[0],match_id:id,tour:'atp',tournament:'Miami',category:'Masters 1000',year:2026,data_source:'api',status:'Finished',round:'Final',winner:1,final_score:'6–4 6–4',score_summary:{...mockMatches[0].score_summary,games:[[6,4],[6,4]],sets:[2,0]},statistics:[],point_tape:[],context:{format:'BO3'}});
test('six reviewed identities collapse to their provider identity without merging unrelated events',()=>{
 for(const [alias,canonical] of Object.entries(MATCH_ID_ALIASES)){
  assert.deepEqual(publishedMatches([result(alias),result(canonical)]).map(m=>m.match_id),[canonical]);
 }
 const a=result('tokyo-500'),b={...result('tokyo-250'),tournament:'Tokyo',category:'ATP 250'};
 assert.equal(publishedMatches([{...a,tournament:'Tokyo',category:'ATP 500'},b]).length,2);
});
test('equivalent selections share a cache key regardless of field, name, duplicate or set order',()=>{
 const a=normalizedCompactSelection({players:['Rafael Nadal','Novak Djokovic','Rafael Nadal'],tour:'atp',categories:['ATP 500','Grand Slam']});
 const b=normalizedCompactSelection({categories:['Grand Slam','ATP 500'],tour:'atp',players:['Novak Djokovic','Rafael Nadal']});
 assert.equal(JSON.stringify(a),JSON.stringify(b));
 assert.notDeepEqual(normalizedCompactSelection({ids:[]}),normalizedCompactSelection({}));
});
test('ETag changes for representation, dataset and query; 304 never carries a body',async()=>{
 assert.notEqual(datasetEtag('a','q','v1'),datasetEtag('a','q','v2'));
 assert.notEqual(datasetEtag('a','q'),datasetEtag('b','q'));
 assert.notEqual(datasetEtag('a','q1'),datasetEtag('a','q2'));
 const response=versionedJson(new Request('https://deuce.test/api',{headers:{'If-None-Match':datasetEtag('a','q')}}),{private:'not returned'},{version:'a',scope:'q',route:'test',started:performance.now()});
 assert.equal(response.status,304);assert.equal(await response.text(),'');
});
test('trusted proxy IP unifies rate limiting and actor hashing without trusting caller first hop',()=>{
 assert.equal(clientAddress(new Request('https://deuce.test',{headers:{'x-real-ip':'203.0.113.8','x-forwarded-for':'1.2.3.4'}})),'203.0.113.8');
 assert.equal(clientAddress(new Request('https://deuce.test',{headers:{'x-forwarded-for':'1.2.3.4, 203.0.113.8'}})),'203.0.113.8');
 assert.equal(clientAddress(new Request('https://deuce.test',{headers:{'x-real-ip':'invalid','x-forwarded-for':'invalid'}})),'unknown');
});
test('published baseline cannot restore synthetic tape or the wrong historic Finals phase',async()=>{
 const previous=result('same'),local={...previous,category:'ATP Finals',round:'Fase de grupos',context:{...previous.context,derivationVersion:'2026-11-finals-v2'}};
 const [fixed]=await preservePublishedArchive([local],{matchCount:1,version:'prior'},async()=>[previous]);
 assert.equal(fixed.category,'ATP Finals');assert.equal(fixed.round,'Fase de grupos');
 const synthetic={...previous,point_tape:[mockMatches[0].point_tape[0]]};
 const clean={...previous,context:{...previous.context,derivationVersion:'2026-11-finals-v2',pointSource:'reconstructed' as const}};
 const [safe]=await preservePublishedArchive([clean],{matchCount:1,version:'prior'},async()=>[synthetic]);
 assert.equal(safe.point_tape.length,0);
});
