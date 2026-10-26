import test from 'node:test';
import assert from 'node:assert/strict';
import { toMatchRecord, resolvedWinner, resolvedSetClosed } from '../data/map-match';
import { homeSelection } from '../lib/deuce-home';
import type { Match } from '../lib/types';
function match(overrides:Partial<Match>={}):Match {
  return {match_id:'example',tournament:'Wimbledon',surface:'grass',category:'Grand Slam',year:2025,
    player1:{name:'Novak Djokovic',seed:null},player2:{name:'Rafael Nadal',seed:null},
    score_summary:{games:[[6,4],[6,7],[6,3],[6,2]],sets:[3,1],points:[],server:null,is_tiebreak:false,win_probability_p1:null,timestamp:''},
    final_score:'6–4 6–7(5) 6–3 6–2',round:'Final',winner:1,status:'finished',point_tape:[],statistics:[],data_source:'reference',
    ...overrides};
}
test('mapper keeps final, flags, long names and the loser’s tie-break index',()=>{
  const card=toMatchRecord(match({context:{indoor:false}}));
  assert.equal(card.isFinal,true);
  assert.equal(card.players[0].name,'Novak Djokovic');
  assert.ok(card.players[0].countryCode);
  assert.deepEqual(card.sets[1].tieBreak,[5,null]);
  assert.equal(card.sets.length,4);
  assert.equal(resolvedWinner(card),0);
  assert.equal(card.category,'Grand Slam');
  assert.equal(card.environment,'Al aire libre');
});
test('backend result prevails for retirement even when trailing',()=>{
  const card=toMatchRecord(match({status:'retired',winner:2}));
  assert.equal(resolvedWinner(card),1);
  delete card.winnerIndex;
  assert.equal(resolvedWinner(card),-1);
});
test('winner inference needs a complete best-of-five match',()=>{
  const card=toMatchRecord(match({winner:null}));
  card.sets=card.sets.slice(0,3);
  assert.equal(resolvedWinner(card),-1);
  card.sets.push({games:[6,2],completed:true});
  assert.equal(resolvedWinner(card),0);
  card.sets[3]={games:[3,1],completed:false};
  assert.equal(resolvedWinner(card),-1);
  assert.equal(resolvedSetClosed({games:[3,1]}),false);
});
test('walkover has no invented set and preserves the declared winner',()=>{
  const source=match({status:'walkover'});
  source.score_summary.games=[];
  const card=toMatchRecord(source);
  assert.deepEqual(card.sets,[]);
  assert.equal(card.winnerIndex,0);
});
test('dates reject impossible calendar days and keep tournament-start precision',()=>{
  assert.equal(toMatchRecord(match({context:{date:'2025-02-30',dateLabel:'Fecha del partido'}})).date,'');
  const card=toMatchRecord(match({context:{date:'2025-07-01',dateLabel:'Inicio del torneo'}}));
  assert.equal(card.date,'2025-07-01');
  assert.equal(card.dateLabel,'Inicio del torneo');
  assert.equal(toMatchRecord(match()).date,'');
});
test('home never promotes tournament start as an anniversary or repeats matches',()=>{
  const source=[
    match({match_id:'start',context:{date:'2025-10-23',dateLabel:'Inicio del torneo'}}),
    match({match_id:'anniversary',context:{date:'2025-10-23',dateLabel:'Fecha del partido'}}),
    match({match_id:'latest',year:2026,round:'Semifinal'}),
  ];
  const selection=homeSelection(source,new Date('2026-10-23T12:00:00Z'));
  assert.equal(selection.anniversary?.match_id,'anniversary');
  const ids=[selection.anniversary?.match_id,selection.featured?.match_id,...selection.latest.map(row=>row.match_id)];
  assert.equal(new Set(ids).size,ids.length);
});
test('home anniversary selection spans decades when the date exists in several eras',()=>{
  const source=[1976,1986,1996,2006,2016,2025].map((year,index)=>match({match_id:`day-${year}`,year,round:index%2?'Final':'Semifinal',context:{date:`${year}-10-23`,dateLabel:'Fecha del partido'}}));
  const selection=homeSelection(source,new Date('2026-10-23T12:00:00Z'));
  assert.equal(selection.anniversaries.length,4);
  assert.equal(new Set(selection.anniversaries.map(row=>Math.floor(row.year/10))).size,4);
  assert.equal(selection.anniversary?.match_id,selection.anniversaries[0].match_id);
});
