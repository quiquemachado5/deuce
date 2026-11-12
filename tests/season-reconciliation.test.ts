import test from 'node:test';
import assert from 'node:assert/strict';
import rows from '../lib/verified-season-results.json';
import {verifiedSeasonResult} from '../lib/verified-season-results';
import {eligibleMatch,prepareMatch} from '../lib/quality';
import {historicalFormat} from '../lib/historical-formats';
import type {Match} from '../lib/types';

function fixture(row:typeof rows[number]):Match{return {
 match_id:row.matchId,tour:row.tour as Match['tour'],year:row.year,tournament:row.tournament,round:row.round,
 category:['Australian Open','Roland Garros','Wimbledon','US Open'].includes(row.tournament)?'Grand Slam':row.tour==='wta'?'WTA 500':'ATP 500',surface:'hard',
 player1:{name:row.first,seed:null},player2:{name:row.second,seed:null},winner:null,status:'Review',final_score:'5–4',
 score_summary:{games:[[5,4]],sets:[],points:[],server:null,is_tiebreak:false,win_probability_p1:null,timestamp:''},point_tape:[],statistics:[],data_source:'api',context:{format:'BO3'},
};}
test('every reconciled result closes, or explicitly remains a retirement',()=>{
 assert.equal(new Set(rows.map(row=>`${row.tour}:${row.year}:${row.matchId}`)).size,rows.length);
 for(const row of rows){const result=prepareMatch(verifiedSeasonResult(fixture(row)));assert.notEqual(result.status,'Review',row.matchId);assert.equal(eligibleMatch(result),['Finished','Retired'].includes(row.status),row.matchId);assert.ok(result.context?.resultSource);assert.ok(result.context?.metadataSources?.length);}
});
test('repair cannot cross circuit, year, fixture, tournament, round or people',()=>{
 const row=rows.find(row=>row.status==='Finished')!,source=fixture(row);
 for(const change of [{tour:row.tour==='atp'?'wta':'atp'},{year:row.year-1},{match_id:'different'},{tournament:'different'},{round:'different'},{player2:{name:'Different player',seed:null}}]){
  const other={...source,...change} as Match;assert.equal(verifiedSeasonResult(other),other);
 }
 const reverse={...source,player1:source.player2,player2:source.player1};
 assert.equal(verifiedSeasonResult(reverse).winner,3-row.winner);
 assert.equal(verifiedSeasonResult(reverse).final_score,row.score.replace(/(\d+)–(\d+)/g,'$2–$1'));
 const strasbourg=rows.find(row=>row.tournament==='Strasbourg')!;
 assert.equal(verifiedSeasonResult({...fixture(strasbourg),tournament:'Strasbourg, France'}).final_score,strasbourg.score);
 const repaired=verifiedSeasonResult({...source,score_summary:{...source.score_summary,points:['40','15'],server:1,is_tiebreak:true,win_probability_p1:.9}});
 assert.deepEqual(repaired.score_summary.points,[]);
 assert.equal(repaired.score_summary.server,null);
 assert.equal(repaired.score_summary.win_probability_p1,null);
});
test('historical formats are scoped by edition and round, never inferred from score length',()=>{
 const base={tour:'atp',category:'Grand Slam',tournament:'Australian Open',year:1982,round:'Ronda de 32'} as Match;
 assert.equal(historicalFormat(base)?.bestOf,3);
 assert.equal(historicalFormat({...base,round:'Cuartos de final'})?.bestOf,5);
 assert.equal(historicalFormat({...base,year:1972,round:'Ronda de 64',context:{date:'1972-12-26'}})?.bestOf,3);
 assert.equal(historicalFormat({...base,tournament:'Wimbledon',year:1978})?.bestOf,5);
 assert.equal(historicalFormat({...base,tour:'wta'}),null);
});
test('eight-all Wimbledon tiebreaks are valid only in their documented era and nondeciding sets',()=>{
 const row=rows.find(row=>row.tour==='atp')!,m={...fixture(row),match_id:'historical-rule-test',tournament:'Wimbledon',category:'Grand Slam',year:1974,status:'Finished',winner:1,final_score:'9–8 6–4 6–3',score_summary:{...fixture(row).score_summary,games:[[9,8],[6,4],[6,3]]}} as Match;
 assert.equal(eligibleMatch(prepareMatch(m)),true);
 assert.equal(eligibleMatch(prepareMatch({...m,year:1980})),false);
 assert.equal(eligibleMatch(prepareMatch({...m,score_summary:{...m.score_summary,games:[[6,4],[4,6],[6,4],[4,6],[9,8]]}})),false);
});
test('match tiebreak is a separate deciding score, never added to the games total',()=>{
 const m={...fixture(rows[0]),match_id:'mt-test',tour:'wta',year:2021,tournament:'Grampians Trophy',category:'WTA 500',status:'Finished',winner:1,player1:{name:'Anett Kontaveit',seed:null},player2:{name:'Maria Sakkari',seed:null},final_score:'2–6 6–3 [11–9]',score_summary:{...fixture(rows[0]).score_summary,games:[[2,6],[6,3]],match_tiebreak:[11,9]}} as Match;
 assert.equal(eligibleMatch(prepareMatch(m)),true);
 assert.equal(prepareMatch(m).score_summary.games.flat().reduce((a,b)=>a+b,0),17);
 assert.equal(eligibleMatch(prepareMatch({...m,tournament:'Different event'})),false);
 for(const tournament of ['Gippsland Trophy','Yarra Valley Classic']){
  assert.equal(eligibleMatch(prepareMatch({...m,tournament,round:'Cuartos de final'})),true);
  assert.equal(eligibleMatch(prepareMatch({...m,tournament,round:'Ronda de 32'})),false);
 }
 assert.equal(eligibleMatch(prepareMatch({...m,score_summary:{...m.score_summary,match_tiebreak:[10,9]}})),false);
});
import {reconcileEditionSummaries} from '../lib/edition-reconcile';
test('saved retirement resolves a stale list without crossing fixture identity',()=>{
 const base=fixture(rows[0]),detail={...base,status:'Retired',winner:1 as const};
 assert.equal(reconcileEditionSummaries([base],[detail])[0],detail);
 for(const changed of [{tour:base.tour==='wta'?'atp':'wta'},{year:base.year-1},{player2:{name:'Other person',seed:null}},{round:'Other round'}])assert.equal(reconcileEditionSummaries([base],[{...detail,...changed} as Match])[0],base);
});
import {reviewedProviderEdition} from '../lib/reviewed-provider-editions';
import {isInPublicationScope} from '../lib/publication-scope';
test('Madrid 125 is isolated from Mutua Madrid, including old baseline rows',()=>{
 const row={tour:'wta',tournament_id:2003,scheduled_time:'2026-04-06T13:00:00Z'};
 assert.equal(reviewedProviderEdition(row)?.category,'WTA 125');
 assert.equal(reviewedProviderEdition({...row,tour:'atp'}),undefined);
 assert.equal(reviewedProviderEdition({...row,scheduled_time:'2026-04-25T13:00:00Z'}),undefined);
 const old={...fixture(rows[0]),tour:'wta',year:2026,tournament:'Madrid',category:'WTA 1000',context:{date:'2026-04-06'}} as Match;
 assert.equal(isInPublicationScope(old),false);
 assert.equal(isInPublicationScope({...old,context:{date:'2026-04-25'}}),true);
});

test('fixture identity corrections never become a global player alias, and qualifiers stay out of the main draw',()=>{
 const row=rows.find(row=>row.matchId==='wta-live-29592')!,source=fixture(row);
 const result=verifiedSeasonResult(source);
 assert.equal(result.player2.name,'Liudmila Samsonova');
 assert.equal(verifiedSeasonResult({...source,match_id:'other-id'}).player2.name,'Laura Samson');
 const reverse=verifiedSeasonResult({...source,player1:source.player2,player2:source.player1});
 assert.equal(reverse.player1.name,'Liudmila Samsonova');
 assert.equal(reverse.winner,2);
 const qualifier=prepareMatch(verifiedSeasonResult(fixture(rows.find(row=>row.matchId==='live-217799')!)));
 assert.equal(qualifier.status,'Finished');
 assert.equal(qualifier.context?.qualifying,true);
 assert.equal(isInPublicationScope(qualifier),false);
});

import scopedFixtures from '../lib/reviewed-fixture-scope.json';
import {isReviewedOutsideMainDraw} from '../lib/reviewed-fixture-scope';
test('invitation playoffs require exact evidence identity and remain outside the main draw',()=>{
 for(const row of scopedFixtures){
  const source={...fixture(rows[0]),match_id:row.matchId,tour:row.tour,year:row.year,tournament:row.tournament,round:row.round,player1:{name:row.first,seed:null},player2:{name:row.second,seed:null},context:{date:row.date}} as Match;
  assert.equal(isReviewedOutsideMainDraw(source),true);assert.equal(isInPublicationScope(source),false);
  assert.equal(isReviewedOutsideMainDraw({...source,player1:source.player2,player2:source.player1}),true);
  for(const change of [{match_id:'other'},{tour:row.tour==='atp'?'wta':'atp'},{year:row.year-1},{tournament:'Rome'},{round:'Final'},{context:{date:'2026-08-24'}},{player1:{name:'Other person',seed:null}}])assert.equal(isReviewedOutsideMainDraw({...source,...change} as Match),false);
 }
});
test('walkovers and cancelled fixtures never invent games or transfer a score',()=>{
 for(const id of ['archive-9430','archive-9421','wta-live-172994','live-76']){
  const row=rows.find(row=>row.matchId===id)!;
  const result=verifiedSeasonResult({...fixture(row),status:'unresolved'});
  assert.equal(result.status,row.status);assert.deepEqual(result.score_summary.games,[]);
  assert.equal(eligibleMatch(prepareMatch(result)),false);
  if(row.status==='Cancelled')assert.equal(result.winner,null);
 }
});
