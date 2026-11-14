import {validPublicArchiveProof} from '../lib/public-archive-proof';
import assert from 'node:assert/strict';
import test from 'node:test';
import {mockMatches} from '../lib/mocks';
import {contentSecurityPolicy} from '../lib/security-policy';
import {searchRecordRows} from '../lib/records-search';
import {curatedComparison} from '../lib/curated-comparisons';
import {classifyPublicationChanges} from '../lib/publication-change-types';
import {compilationPlan,statisticInputHash,assertCompilationEquivalent} from '../lib/revista/incremental-compilation';
import {compilePublicArchiveProducts} from '../lib/public-archive-products';
import {compileRecordSnapshot} from '../lib/revista/snapshot';

const match={...mockMatches[0],tour:'atp' as const,data_source:'api' as const};
test('CSP authorizes a per-response nonce and forbids arbitrary executable inline code',()=>{
 const policy=contentSecurityPolicy('abcdefghijklmnopqrstuvwx');
 const scripts=policy.split(';').find(value=>value.trim().startsWith('script-src '))!;
 assert.match(scripts,/'nonce-abcdefghijklmnopqrstuvwx'/);assert.doesNotMatch(scripts,/unsafe-inline|unsafe-eval/);
 assert.match(policy,/script-src-attr 'none'/);assert.match(policy,/frame-src https:\/\/www.youtube-nocookie.com/);
 assert.throws(()=>contentSecurityPolicy("bad'; script-src *"));
});
test('ranking search includes every page, folds accents and preserves tied positions',()=>{
 const rows=Array.from({length:80},(_,index)=>({name:index===65?'Rafael Nadal':index===66?'Ráfael Nadal Dos':`Persona ${index}`,value:index===66?15:80-index,sample:100,detail:'',href:'/jugadores/test'}));
 assert.deepEqual(searchRecordRows(rows,'rafael nadal').map(row=>row.position),[66,66]);
 assert.deepEqual(searchRecordRows(rows,'inexistente'),[]);
});
test('only curated unfiltered symmetric pairs are indexable',()=>{
 assert.ok(curatedComparison({a:'Rafael Nadal',b:'Roger Federer'}));
 assert.ok(curatedComparison({a:'Roger Federer',b:'Rafael Nadal'}));
 assert.equal(curatedComparison({a:'Roger Federer',b:'Rafael Nadal',surface:'clay'}),undefined);
 assert.equal(curatedComparison({a:'Roger Federer',b:'Nobody'}),undefined);
});
test('ranking enrichment is not reported as a corrected sporting result',()=>{
 const changed={...match,context:{...match.context,rank1:999}};
 const result=classifyPublicationChanges([match],[changed]);assert.equal(result.ranking,1);assert.equal(result.results,0);
 const sporting=classifyPublicationChanges([match],[{...match,round:'Final'}]);assert.equal(sporting.results,match.round==='Final'?0:1);
});
test('statistical reuse invalidates actual point/stat values, ignores retrieval timestamps and verifies weekly',()=>{
 const now=new Date('2026-11-14T12:00:00Z'),snapshot=compileRecordSnapshot([match],now);
 const hash=statisticInputHash([match],snapshot.manifest.rulesVersion,2026);
 assert.equal(hash,statisticInputHash([{...match,provider_revision:{retrieved_at:'2026-11-15'}}],snapshot.manifest.rulesVersion,2026));
 assert.notEqual(hash,statisticInputHash([{...match,context:{...match.context,minutes:987}}],snapshot.manifest.rulesVersion,2026));
 snapshot.manifest.compilation={inputs:{atp:hash,wta:statisticInputHash([],snapshot.manifest.rulesVersion,2026)},fullVerifiedAt:now.toISOString(),reusedCircuits:[]};
 assert.deepEqual(compilationPlan([match],snapshot.manifest,new Date('2026-11-15')).reuse,['atp','wta']);
 assert.equal(compilationPlan([match],snapshot.manifest,new Date('2026-11-22')).verifyFull,true);
 const pages={pages:{'1':[{name:'A',value:1,sample:1,detail:'',href:'/a'}]},smallPages:{}};
 assert.throws(()=>assertCompilationEquivalent({wins:{...pages,pages:{'1':[{...pages.pages['1'][0],value:2}]}}},{atp:{meta:[],pieces:{wins:pages}}}),/differs/);
});
test('public sitemap preserves real revisions and includes in-progress tournament editions',()=>{
 const snapshot=compileRecordSnapshot([{...match,round:'Ronda de 32'}],new Date('2026-11-14'));
 const data=compilePublicArchiveProducts(snapshot.matches,snapshot.players,snapshot.manifest,{schema:1,pages:{'/records':{hash:'a'.repeat(24),modifiedAt:'2026-11-13T12:00:00Z'}},corrections:[]});
 assert.equal(data.sitemap.find(row=>row.url.endsWith('/records'))?.lastModified,'2026-11-13T12:00:00Z');
 assert.ok(data.sitemap.some(row=>row.url.includes('/torneos/')&&row.url.includes(String(match.year))));
 assert.equal(data.coverage.reduce((sum,row)=>sum+row.matches,0),1);
});

test('reused circuit classification matches the complete compiler, including calendar records',()=>{
 const now=new Date('2026-11-14'),full=compileRecordSnapshot([match],now);
 const baseline={atp:{meta:full.manifest.pieces,pieces:Object.fromEntries(Object.entries(full.pieces).filter(([id])=>!id.startsWith('wta-')))},eras:full.eras};
 const reused=compileRecordSnapshot([match],now,[],[],full.manifest,baseline);
 assert.deepEqual(reused.manifest.pieces,full.manifest.pieces);
 assertCompilationEquivalent(reused.pieces,baseline);
});

test('light publication proofs reject altered totals, missing players and wrong generations',()=>{
 const snapshot=compileRecordSnapshot([match],new Date('2026-11-14'));
 const proof=compilePublicArchiveProducts(snapshot.matches,snapshot.players,snapshot.manifest);
 assert.equal(validPublicArchiveProof(proof,snapshot.manifest),true);
 assert.equal(validPublicArchiveProof({...proof,version:'wrong'},snapshot.manifest),false);
 assert.equal(validPublicArchiveProof({...proof,players:{}},snapshot.manifest),false);
 assert.equal(validPublicArchiveProof({...proof,integrity:{...proof.integrity,playerParticipations:1}},snapshot.manifest),false);
 assert.equal(validPublicArchiveProof({...proof,coverage:[]},snapshot.manifest),false);
 assert.throws(()=>compilePublicArchiveProducts(snapshot.matches,[],snapshot.manifest),/participation/);
});
