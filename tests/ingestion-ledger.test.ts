import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIngestionLedger, ingestionSlaStatus } from '../lib/ingestion-ledger';
import type { Match } from '../lib/types';

const row = (tour:'atp'|'wta',category:string,date:string,id:string):Match => ({
  match_id:id,tour,tournament:'Test',surface:'hard',category,year:2026,
  player1:{name:'A',seed:null},player2:{name:'B',seed:null},final_score:'6–4 6–4',round:'Final',winner:1,status:'finished',
  score_summary:{sets:[2,0],games:[[6,4],[6,4]],points:[],server:null,is_tiebreak:false,win_probability_p1:null,timestamp:`${date}T12:00:00Z`},
  point_tape:[],statistics:[],data_source:'api',context:{date},
});

test('ingestion ledger keeps circuits and tiers separated',()=>{
  const ledger=buildIngestionLedger([row('atp','ATP 500','2026-11-01','a'),row('wta','WTA 500','2026-11-02','b')],'2026-11-03T00:00:00Z');
  assert.equal(ledger.tours.atp.matches,1);
  assert.equal(ledger.tours.wta.matches,1);
  assert.equal(ledger.tours.atp.tiers.find(tier=>tier.category==='ATP 500')?.latestResultDate,'2026-11-01');
  assert.equal(ledger.tours.wta.tiers.find(tier=>tier.category==='WTA 500')?.latestResultDate,'2026-11-02');
  assert.equal(ledger.tours.atp.tiers.some(tier=>tier.category.startsWith('WTA')),false);
});

test('ingestion SLA exposes a deterministic recovery decision',()=>{
  assert.equal(ingestionSlaStatus('2026-11-01T00:00:00Z',Date.parse('2026-11-02T11:00:00Z')).recoveryDue,false);
  const overdue=ingestionSlaStatus('2026-11-01T00:00:00Z',Date.parse('2026-11-02T13:00:00Z'));
  assert.equal(overdue.state,'overdue');
  assert.equal(overdue.recoveryDue,true);
});
