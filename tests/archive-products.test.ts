import test from 'node:test';
import assert from 'node:assert/strict';
import { mockMatches } from '../lib/mocks';
import { buildArchiveProducts, DEUCE_ELO_MODEL_VERSION, editionProductKey, eloPlayer } from '../lib/archive-products';
import { buildSeasonAnalytics } from '../lib/season-analytics';
import type { Match } from '../lib/types';

function fixture(id:string,tour:'atp'|'wta',date:string,winner:1|2=1):Match{return {...mockMatches[0],match_id:id,tour,year:Number(date.slice(0,4)),tournament:tour==='atp'?'Wimbledon':'US Open',category:'Grand Slam',round:'Final',surface:tour==='atp'?'grass':'hard',player1:{name:tour==='atp'?'One ATP':'One WTA',seed:1},player2:{name:tour==='atp'?'Two ATP':'Two WTA',seed:2},winner,context:{date,dateLabel:'Fecha del partido',format:'BO3'},score_summary:{...mockMatches[0].score_summary,timestamp:`${date}T12:00:00Z`,games:winner===1?[[6,4],[6,4]]:[[4,6],[4,6]]},final_score:winner===1?'6–4 6–4':'4–6 4–6',statistics:[],point_tape:[]}}

test('published products remain circuit-separated and reproducible',()=>{
  const matches=[fixture('atp-1','atp','2020-07-12'),fixture('atp-2','atp','2021-07-11',2),fixture('wta-1','wta','2020-09-12')];
  const records=buildSeasonAnalytics(matches).players,products=buildArchiveProducts(matches,records);
  assert.equal(products.players.circuits.atp.records.length,2);
  assert.equal(products.players.circuits.wta.records.length,2);
  assert.ok(products.editions.editions[editionProductKey('atp','wimbledon',2020,'Grand Slam')]);
  assert.ok(eloPlayer(products.elo,'One ATP','atp'));
  assert.equal(eloPlayer(products.elo,'One ATP','wta'),undefined);
  assert.equal(products.elo.modelVersion,DEUCE_ELO_MODEL_VERSION);
  assert.equal(products.elo.calibration?.all.matches,3);
  assert.equal(products.elo.calibration?.atp.matches,2);
  assert.equal(products.elo.calibration?.wta.matches,1);
  assert.equal(products.elo.surfaceCalibration?.grass.atp.matches,2);
  assert.equal(products.elo.surfaceCalibration?.hard.wta.matches,1);
  assert.equal(eloPlayer(products.elo,'One ATP','atp')?.expectedWins,1.1);
  assert.equal(eloPlayer(products.elo,'One ATP','atp')?.winsAboveExpected,-0.1);
  assert.ok((eloPlayer(products.elo,'One ATP','atp')?.averageOpponentRating||0)>0);
  assert.ok((products.elo.calibration?.all.brier||0)>0);
  assert.ok((products.elo.calibration?.all.logLoss||0)>0);
  assert.deepEqual(products.search.recentMatchIdsByPlayer?.['atp:one-atp'],['atp-2','atp-1']);
  assert.equal(products.search.indexedMatches?.['wta-1'].tour,'wta');
  assert.equal(products.search.indexedMatches?.['atp-1'].tour,'atp');
  assert.deepEqual(products.timeMachine.days['07-12'].map(row=>row.id),['atp-1']);
  assert.deepEqual(products.timeMachine.days['09-12'].map(row=>row.id),['wta-1']);
});

test('edition products publish a tactical profile only from measured statistics',()=>{
  const match={...fixture('tactical','atp','2024-07-14'),statistics:[
    {player:1 as const,period:'match',category:'Service',name:'Aces',value:'8',won:8,total:null},
    {player:2 as const,period:'match',category:'Service',name:'Aces',value:'4',won:4,total:null},
    {player:1 as const,period:'match',category:'Service',name:'Service games won',value:'9',won:9,total:null},
    {player:1 as const,period:'match',category:'Service',name:'Service games played',value:'10',won:10,total:null},
    {player:2 as const,period:'match',category:'Service',name:'Service games won',value:'7',won:7,total:null},
    {player:2 as const,period:'match',category:'Service',name:'Service games played',value:'10',won:10,total:null},
    {player:1 as const,period:'match',category:'Breaks',name:'Break points converted',value:'3/6',won:3,total:6},
    {player:2 as const,period:'match',category:'Breaks',name:'Break points converted',value:'1/4',won:1,total:4},
  ]};
  const products=buildArchiveProducts([match],buildSeasonAnalytics([match]).players);
  const edition=products.editions.editions[editionProductKey('atp','wimbledon',2024,'Grand Slam')];
  assert.equal(edition.tactical?.acesPerMatch?.value,12);
  assert.equal(edition.tactical?.holdRate?.value,80);
  assert.equal(edition.tactical?.breakRate?.value,40);
});

test('time machine caps each calendar day without rescanning the source archive',()=>{
  const matches=Array.from({length:40},(_,index)=>fixture(`same-day-${index}`,'atp',`${1980+index}-01-05`));
  const products=buildArchiveProducts(matches,buildSeasonAnalytics(matches).players);
  assert.equal(products.timeMachine.days['01-05'].length,24);
  assert.equal(new Set(products.timeMachine.days['01-05'].map(row=>row.id)).size,24);
});
