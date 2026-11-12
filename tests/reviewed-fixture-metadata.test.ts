import test from 'node:test';import assert from 'node:assert/strict';
import decisions from '../lib/reviewed-fixture-metadata.json';
import {reviewedFixtureMetadata,reviewedFixtureMetadataDecision}from'../lib/reviewed-fixture-metadata';
import{isInPublicationScope}from'../lib/publication-scope';import{eligibleMatch,prepareMatch}from'../lib/quality';
import{verifiedSeasonResult}from'../lib/verified-season-results';
import{editionReferenceMatches}from'../lib/verified-editions';
import{mockMatches}from'../lib/mocks';import type{Match}from'../lib/types';
const fixture=(row:typeof decisions[number]):Match=>({...mockMatches[0],match_id:row.matchId,tour:row.tour as Match['tour'],year:row.year,tournament:row.tournament,category:row.tournament==='Rome'?'WTA 1000':'Grand Slam',round:row.round,player1:{name:row.first,seed:null},player2:{name:row.second,seed:null},context:{date:row.date},status:'Finished'});
test('five exact reviewed fixture identities repair their metadata without changing the result',()=>{
 for(const row of decisions){const source=fixture(row),result=reviewedFixtureMetadata(source);
  assert.equal(result.round,row.correctedRound);assert.equal(result.score_summary,source.score_summary);assert.equal(result.final_score,source.final_score);assert.equal(result.winner,source.winner);
  assert.equal(isInPublicationScope(result),!row.outsideMainDraw);assert.equal(isInPublicationScope(source),!row.outsideMainDraw);
  assert.ok(new Set(result.context?.metadataSources?.map(source=>new URL(source.url).hostname)).size>=2);
  assert.equal(reviewedFixtureMetadata(reviewedFixtureMetadata(source)).context?.metadataSources?.length,result.context?.metadataSources?.length);
  for(const change of[{match_id:'other'},{tour:row.tour==='atp'?'wta':'atp'},{year:row.year+1},{tournament:'Other'},{round:'Final'},{context:{date:'2020-01-01'}},{player1:{name:'Other',seed:null}}])assert.equal(reviewedFixtureMetadataDecision({...source,...change}as Match),undefined);
 }
});
test('AO1973 repair uses official season identity instead of December1972 source date',()=>{
 const input:Match={...mockMatches[0],match_id:'archive-21163',tour:'atp',year:1973,tournament:'Australian Open',category:'Grand Slam',round:'Semifinal',status:'Finished',winner:1,player1:{name:'Onny Parun',seed:null},player2:{name:'Karl Meiler',seed:null},context:{date:'1972-12-26',format:'BO5'}};
 const result=verifiedSeasonResult(input);assert.equal(result.final_score,'2–6 6–3 7–5 6–1');assert.equal(eligibleMatch(prepareMatch(result)),true);
 const wrong={...input,year:1972};assert.equal(verifiedSeasonResult(wrong),wrong);
});
test('three Adelaide2023 walkovers remain terminal entries, not invented wins or statistics',()=>{
 const rows=editionReferenceMatches.filter(m=>m.match_id.startsWith('reference-adelaide2-2023-'));
 assert.equal(rows.length,3);
 for(const row of rows){assert.equal(row.status,'Walkover');assert.deepEqual(row.score_summary.games,[]);assert.equal(eligibleMatch(prepareMatch(row)),false);assert.deepEqual(row.statistics,[]);assert.deepEqual(row.point_tape,[]);}
});

test('US1972 and AO1975 secondary-source repairs preserve exact identities and produce legal BO5 results',()=>{
 const rows=[{id:'archive-16694',year:1972,tournament:'US Open',round:'Ronda de 128',first:'Owen Davidson',second:'Charles Owens',score:'6–4 7–6 3–6 4–6 6–3',games:[[6,4],[7,6],[3,6],[4,6],[6,3]]},{id:'archive-29689',year:1975,tournament:'Australian Open',round:'Ronda de 64',first:'Graeme Thomson',second:'Mike Prineas',score:'6–4 6–3 6–3',games:[[6,4],[6,3],[6,3]]}];
 for(const row of rows){
  const source:Match={...mockMatches[0],match_id:row.id,tour:'atp',year:row.year,tournament:row.tournament,category:'Grand Slam',round:row.round,status:'Review',winner:null,player1:{name:row.first,seed:null},player2:{name:row.second,seed:null},context:{format:'BO5'}};
  const repaired=verifiedSeasonResult(source);assert.equal(repaired.final_score,row.score);assert.deepEqual(repaired.score_summary.games,row.games);assert.equal(eligibleMatch(prepareMatch(repaired)),true);assert.deepEqual(repaired.statistics,[]);assert.deepEqual(repaired.point_tape,[]);
  const reverse=verifiedSeasonResult({...source,player1:source.player2,player2:source.player1});assert.equal(reverse.winner,2);assert.deepEqual(reverse.score_summary.games,row.games.map(([a,b])=>[b,a]));
  for(const change of[{tour:'wta'},{year:row.year-1},{round:'Final'},{player2:{name:'Other',seed:null}}]){const other={...source,...change}as Match;assert.equal(verifiedSeasonResult(other),other);}
 }
});
