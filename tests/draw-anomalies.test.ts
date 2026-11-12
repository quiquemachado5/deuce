import assert from 'node:assert/strict';
import test from 'node:test';
import { assertNoBlockingDrawAnomalies, detectDrawAnomalies } from '../lib/draw-anomalies';
import type { Match } from '../lib/types';

const valid:Match={match_id:'one',tour:'atp',tournament:'Test',surface:'hard',category:'ATP 250',year:2026,player1:{name:'A',seed:null},player2:{name:'B',seed:null},score_summary:{sets:[2,0],games:[[6,4],[6,4]],points:[],server:null,is_tiebreak:false,win_probability_p1:null,timestamp:'2026-11-01T00:00:00Z'},final_score:'6–4 6–4',round:'Final',winner:1,status:'finished',point_tape:[],statistics:[],data_source:'api',context:{date:'2026-11-01'}};

test('draw anomaly gate accepts a consistent result',()=>{
  assert.equal(assertNoBlockingDrawAnomalies([valid]).blocking,0);
});

test('draw anomaly gate finds impossible scores and duplicate identities',()=>{
  const impossible={...valid,match_id:'two',score_summary:{...valid.score_summary,games:[[6,4],[4,6]]}};
  const report=detectDrawAnomalies([valid,valid,impossible]);
  assert.ok(report.issues.some(issue=>issue.code==='duplicate-id'));
  assert.ok(report.issues.some(issue=>issue.code==='impossible-score'));
  assert.throws(()=>assertNoBlockingDrawAnomalies([impossible]),/Publication blocked/);
});
