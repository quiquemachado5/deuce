import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
import{archiveMatches}from'../lib/live-tennis';import{publishedMatches,isInPublicationScope}from'../lib/publication-scope';import{isCompetitionOnly,prepareCompetitionMatch}from'../lib/competition';import{prepareMatch}from'../lib/quality';import{filterArchive}from'../lib/archive-index';import{auditEditions}from'../lib/edition-audit';import{reviewedHistoricalEdition,reviewedHistoricalEditionCoverage}from'../lib/reviewed-historical-editions';import type{Match}from'../lib/types';

test('Dubai2006 publishes the entire reviewed historic edition rather than a selective Nadal result',async()=>{
 const rows=(await archiveMatches(2006,true)).filter(m=>m.tour==='atp'&&m.tournament==='Dubai');assert.equal(rows.length,31);assert.ok(rows.every(m=>m.category==='ATP International Series Gold'));assert.equal(publishedMatches(rows.map(prepareMatch)).length,30);assert.equal(rows.filter(isCompetitionOnly).length,1);assert.equal(rows.filter(isCompetitionOnly).map(prepareCompetitionMatch)[0].status.toLowerCase(),'walkover');assert.ok(rows.every(isInPublicationScope));assert.equal(filterArchive(rows,{competition:'ATP 500'}).length,31);assert.ok(rows.every(m=>m.category!=='ATP 500'));
 const corrected=rows.find(m=>m.match_id==='archive-141681')!;assert.equal(corrected.player2.name,'Omar Behrouzyan');assert.equal(corrected.context?.rank2,null);assert.equal(corrected.context?.age2,null);
 const final=rows.find(m=>m.match_id==='archive-141710')!;assert.equal(final.final_score,'2–6 6–4 6–4');assert.equal(final.player1.name,'Rafael Nadal');assert.equal(final.winner,1);
 const audit=auditEditions(rows)[0];assert.deepEqual(audit.rounds,{'3':16,'4':8,'5':4,'6':2,'7':1});assert.equal(audit.completeDraw,true);
 for(const change of[{tour:'wta'},{year:2005},{match_id:'not-reviewed'},{tournament:'Doha'},{round:'Ronda de 32'},{player2:{name:'Other',seed:null}}])assert.equal(reviewedHistoricalEdition({...final,...change}as Match),undefined);
 assert.equal(reviewedHistoricalEditionCoverage(rows.slice(1)),undefined);assert.equal(auditEditions(rows.slice(1))[0].completeDraw,false);
});
test('40th FedererNadal encounter is independently sourced and admitted only through the complete Dubai edition',async()=>{
 const before=JSON.parse(readFileSync('data/archive/references/h2h-federer-nadal-v31/published-before-39.json','utf8'))as Match[];
 const dubai=(await archiveMatches(2006,true)).filter(m=>m.tournament==='Dubai');
 const pair=(m:Match)=>new Set([m.player1.name,m.player2.name]).size===2&&[m.player1.name,m.player2.name].every(n=>['Roger Federer','Rafael Nadal'].includes(n));const rows=publishedMatches([...before,...dubai].map(prepareMatch)).filter(pair);assert.equal(rows.length,40);assert.equal(rows.filter(m=>(m.winner===1?m.player1.name:m.player2.name)==='Rafael Nadal').length,24);
});
test('Dubai official draw and historical category evidence retain immutable original body hashes',()=>{
 const root='data/archive/references/h2h-federer-nadal-v31';const manifest=JSON.parse(readFileSync(root+'/sources.json','utf8'));
 for(const id of['dubai2006-atp-draw','dubai2006-tournament-newspaper','dubai2006-gulfnews-category']){const source=manifest.sources.find((s:{id:string;file?:string})=>s.id===id&&s.file);assert.ok(source);const bytes=gunzipSync(readFileSync(root+'/'+source.file));assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);}
});
