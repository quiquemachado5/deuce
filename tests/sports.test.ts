import test from 'node:test';
import assert from 'node:assert/strict';
import {mockMatches} from '../lib/mocks';
import {matchStory} from '../lib/match-story';
import {activityFixtures,tourActivity} from '../lib/tour-activity';
import {detailRefreshPlan} from '../lib/detail-refresh-plan';
test('set stories preserve unknown games and never invent a point sequence',()=>{
  const m={...mockMatches[0],point_tape:[],score_summary:{...mockMatches[0].score_summary,games:[[7,6],[6,4]]}};
  const sets=matchStory(m);
  assert.equal(sets[0].known,0);assert.equal(sets[0].games.length,13);
  assert.ok(sets[0].games.every(g=>g.winner===null&&!g.isBreak));
  assert.equal(sets[0].games.at(-1)?.tiebreak,true);assert.equal(sets[1].winner,1);
});
test('activity requires a recent observed schedule; past archive results alone are not live',()=>{
  const now=new Date('2026-10-21T12:00:00Z');
  const fixtures=activityFixtures([{id:1,tournament:'ATP Basel',scheduled_time:'2026-10-21T15:00:00Z',players:{p1:{name:'A'},p2:{name:'B'}}}], 'upcoming');
  assert.equal(fixtures.length,1);assert.equal(activityFixtures([{}],'live').length,0);
  assert.equal(tourActivity(null,[],now).length,0);
  assert.equal(tourActivity({checkedAt:'2026-10-19',fixtures,complete:true},[],now).length,0);
  assert.equal(tourActivity({checkedAt:now.toISOString(),fixtures,complete:true},[],now)[0].ongoing,false);
  assert.equal(tourActivity({checkedAt:now.toISOString(),fixtures:fixtures.map(f=>({...f,status:'live'})),complete:true},[],now)[0].ongoing,true);
});
test('daily detail refresh prioritizes corrections and rotates already checked results',()=>{
  const rows=[{id:'a',outcome:'completed',scheduled_time:'2026-10-21'},{id:'b',outcome:'completed',scheduled_time:'2026-10-20'},{id:'c',outcome:'completed',scheduled_time:'2026-10-01'}];
  const previous=new Map(rows.map(r=>[r.id,r]));
  assert.deepEqual(detailRefreshPlan(rows,previous,()=>true,{a:'2026-10-21'},Date.parse('2026-10-21')).map(r=>r.id),['b','a']);
  const corrected=[...rows.slice(0,2),{...rows[2],scheduled_time:'2026-10-02'}];
  assert.equal(detailRefreshPlan(corrected,previous,()=>true,{},Date.parse('2026-10-21'))[0].id,'c');
});
