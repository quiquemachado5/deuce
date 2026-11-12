import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';
import registry from'../lib/reviewed-team-competition-scope.json';import{reviewedTeamCompetition,classifyReviewedTeamCompetition}from'../lib/reviewed-team-competition-scope';import{isInPublicationScope}from'../lib/publication-scope';import{isReviewedOutsideMainDraw}from'../lib/reviewed-fixture-scope';import{mockMatches}from'../lib/mocks';import type{Match}from'../lib/types';import{assertReleaseCoverage}from'../lib/revista/release-check';import type{RecordManifest}from'../lib/revista/snapshot';
function fixture(row:typeof registry.entries[number]):Match{
 const [tour,year,,date,round,players]=JSON.parse(row.fingerprint);return{...mockMatches[0],match_id:row.matchId,tour,year,tournament:row.tournament,category:row.originalCategory,round,context:{date},player1:{name:players[0],seed:null},player2:{name:players[1],seed:null}};
}
test('exact reviewed ATP Cup identities stay archived as team rubbers and cannot count as ATP250',()=>{
 assert.equal(registry.entries.length,170);assert.equal(new Set(registry.entries.map(r=>r.matchId)).size,170);
 for(const row of registry.entries){const original=fixture(row),classified=classifyReviewedTeamCompetition(original);assert.equal(classified.category,'ATP Cup');assert.equal(classified.final_score,original.final_score);assert.equal(classified.score_summary,original.score_summary);assert.equal(isInPublicationScope(original),false);assert.equal(isInPublicationScope(classified),false);assert.ok(new Set(row.sources.map(s=>new URL(s).hostname)).size>=2);
  const reversed={...original,player1:original.player2,player2:original.player1};assert.ok(reviewedTeamCompetition(reversed));
  if(original.round==='Fase de grupos')assert.ok(reviewedTeamCompetition({...original,round:'RR'}),'Old immutable RR label must match the reviewed group-stage identity');
  for(const change of[{match_id:'other'},{tour:'wta'},{year:2019},{tournament:'Laver Cup'},{round:'Other'},{category:'Masters 1000'},{player2:{name:'Other',seed:null}},{context:{date:'2020-12-12'}}])assert.equal(reviewedTeamCompetition({...original,...change}as Match),undefined);
 }
});
test('scope allowance covers only the reviewed published baseline rows and never another lost match',()=>{
 const matches=JSON.parse(gunzipSync(readFileSync('data/reading/matches.json.gz')).toString())as Match[];
 const removed=matches.filter(m=>reviewedTeamCompetition(m));
 // Subsequent rebuilds legitimately remove these from the public reading generation.
 if(!removed.length)return;
 assert.ok(removed.every(isReviewedOutsideMainDraw));
 const atp=matches.filter(m=>(m.tour||'atp')==='atp').length,wta=matches.length-atp;
 const baseline={rulesVersion:'test',matchCount:matches.length,pieces:[],summary:{tours:{atp,wta}}}as unknown as RecordManifest;
 const current={...baseline,matchCount:matches.length-removed.length,summary:{...baseline.summary,tours:{atp:atp-removed.length,wta}}};
 assert.doesNotThrow(()=>assertReleaseCoverage(baseline,current,removed));
 assert.throws(()=>assertReleaseCoverage(baseline,{...current,matchCount:current.matchCount-1},removed),/lose published/);
});
