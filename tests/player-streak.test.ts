import assert from 'node:assert/strict';
import test from 'node:test';
import { longestPlayerWinningRun } from '../lib/player-streak';
import { mockMatches } from '../lib/mocks';
import { eligibleMatch } from '../lib/quality';
import type { Match } from '../lib/types';

const fixture=(id:string,day:number,winner:1|2=1,tour:'atp'|'wta'='atp'):Match=>({
  ...mockMatches[0],match_id:id,year:2020,tournament:'Streak Test Open',category:'ATP 250',tour,round:'Ronda de 32',status:'finished',winner,
  player1:{name:'Run Player',seed:null},player2:{name:'Opponent '+id,seed:null},final_score:winner===1?'6-4 6-4':'4-6 4-6',
  context:{...mockMatches[0].context,date:'2020-01-'+String(day).padStart(2,'0'),dateLabel:'Fecha del partido',format:'BO3'},
  score_summary:{...mockMatches[0].score_summary,games:winner===1?[[6,4],[6,4]]:[[4,6],[4,6]]},
});
test('returns the actual ordered matches and stops the run on defeat',()=>{
  const rows=[fixture('a',1),fixture('b',2),fixture('loss',3,2),fixture('c',4),fixture('d',5),fixture('e',6)];
  assert(rows.every(eligibleMatch));
  assert.deepEqual(longestPlayerWinningRun(rows.reverse(),'Run Player','atp').map(match=>match.match_id),['c','d','e']);
});
test('keeps circuits separate, ignores duplicates and breaks on an ineligible result',()=>{
  const a=fixture('a',1),b=fixture('b',2);
  const invalid={...fixture('invalid',3),status:'Review'};
  const rows=[a,a,fixture('wta-loss',2,2,'wta'),b,invalid,fixture('c',4)];
  assert.deepEqual(longestPlayerWinningRun(rows,'Run Player','atp').map(match=>match.match_id),['a','b']);
  assert.deepEqual(longestPlayerWinningRun(rows,'Run Player','wta'),[]);
});
test('does not bridge unrelated player results or discard an equally long first run',()=>{
  const rows=[fixture('a',1),{...fixture('unrelated',2),player1:{name:'Other',seed:null}},fixture('b',3),fixture('loss',4,2),fixture('c',5),fixture('d',6)];
  assert.deepEqual(longestPlayerWinningRun(rows,'Run Player','atp').map(match=>match.match_id),['a','b']);
});
