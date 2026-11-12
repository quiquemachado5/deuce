import test from 'node:test';import assert from 'node:assert/strict';
import {datedEloEvidence} from '../lib/research/dated-elo-evidence';import type {Match} from '../lib/types';
const match=(id:string,date:string,winner:1|2=1,tour:'atp'|'wta'='atp'):Match=>({match_id:id,tour,year:2024,tournament:'Example',category:'ATP 250',surface:'hard',player1:{name:'A',seed:null},player2:{name:'B',seed:null},winner,round:'Final',status:'finished',final_score:winner===1?'6-3 6-4':'3-6 4-6',score_summary:{games:winner===1?[[6,3],[6,4]]:[[3,6],[4,6]],sets:winner===1?[2,0]:[0,2],points:[],server:null,is_tiebreak:false,win_probability_p1:null,timestamp:date},statistics:[],point_tape:[],data_source:'reference',context:{date,dateLabel:'Fecha del partido'}});
test('Elo is pre-match, circuit-isolated and cannot learn from the same day or future',()=>{
 const a=match('a','2024-01-01'),b=match('b','2024-01-01'),c=match('c','2024-01-02'),w=match('w','2024-01-02',1,'wta');
 const x=datedEloEvidence([a,b,c,w]);assert.equal(x.elo.get('a|A'),1500);assert.equal(x.elo.get('b|A'),1500);assert.equal(x.elo.get('c|A'),1532);assert.equal(x.elo.get('w|A'),1500);
 assert.deepEqual([...x.elo], [...datedEloEvidence([w,c,b,a]).elo]);
 assert.equal(datedEloEvidence([a,b,match('c','2024-01-02',2)]).elo.get('c|A'),x.elo.get('c|A'));
});
test('approximate dates and unfinished results cannot enter a dated Elo model',()=>{
 const m=match('a','2024-01-01');const x=datedEloEvidence([{...m,context:{...m.context,dateLabel:'Inicio del torneo'}},{...m,match_id:'ret',status:'live'}]);assert.equal(x.elo.size,0);assert.equal(x.calibration.atp.matches,0);assert.equal(x.calibration.atp.brier,null);
});
