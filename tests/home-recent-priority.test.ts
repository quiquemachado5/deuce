import test from 'node:test';
import assert from 'node:assert/strict';
import { homeRecentResults } from '../lib/deuce-home';
import type { Match } from '../lib/types';

function match(id:string,category:string,date:string,tour:'atp'|'wta'='atp'):Match{
  const bestOfFive=category==='Grand Slam'&&tour==='atp';
  return {match_id:id,tour,category,year:2026,tournament:category==='Grand Slam'?'US Open':'Paris',surface:'hard',round:'Final',player1:{name:'One',seed:null},player2:{name:'Two',seed:null},winner:1,status:'finished',data_source:'reference',point_tape:[],statistics:[],final_score:bestOfFive?'6–4 6–4 6–4':'6–4 6–4',context:{date,dateLabel:'Fecha del partido'},score_summary:{games:bestOfFive?[[6,4],[6,4],[6,4]]:[[6,4],[6,4]],sets:[bestOfFive?3:2,0],points:[],server:null,is_tiebreak:false,win_probability_p1:null,timestamp:''}};
}
const today=new Date('2026-11-10T12:00:00Z');
test('home prioritizes major tiers within recent results and keeps chronology within a tier',()=>{
  const rows=[match('250','ATP 250','2026-11-09'),match('500','ATP 500','2026-11-04'),match('1000-old','Masters 1000','2026-10-20'),match('1000-new','Masters 1000','2026-11-03'),match('slam','Grand Slam','2026-10-05')];
  assert.deepEqual(homeRecentResults(rows,today).map(row=>row.match_id),['slam','1000-new','1000-old','500','250']);
});
test('an old Grand Slam cannot replace a recent result and completed circuits remain balanced',()=>{
  const rows=[match('old','Grand Slam','2026-09-01'),...Array.from({length:5},(_,i)=>match(`atp${i}`,'Masters 1000',`2026-11-0${i+1}`)),...Array.from({length:5},(_,i)=>match(`wta${i}`,'WTA 500',`2026-11-0${i+1}`,'wta'))];
  const selected=homeRecentResults(rows,today);
  assert.equal(selected.length,6);assert.equal(selected.filter(row=>row.tour==='atp').length,3);assert.equal(selected.filter(row=>row.tour==='wta').length,3);assert.ok(!selected.some(row=>row.match_id==='old'));
});
test('with one circuit available the remaining slots fill without duplicated matches',()=>{
  const rows=Array.from({length:8},(_,i)=>match(String(i),'ATP 500',`2026-11-0${i+1}`));
  const selected=homeRecentResults(rows,today);assert.equal(selected.length,6);assert.equal(new Set(selected.map(row=>row.match_id)).size,6);assert.equal(homeRecentResults([],today).length,0);
});
