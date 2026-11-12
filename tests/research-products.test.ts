import test from 'node:test';
import assert from 'node:assert/strict';
import {mockMatches} from '../lib/mocks';
import type {Match} from '../lib/types';
import {RESEARCH_RECIPES,calculateResearchProducts} from '../lib/research/recipes';
import {auditResearchQuality} from '../lib/research/quality-controls';
import {evidenceConsensus,type EvidenceObservation} from '../lib/research/evidence-consensus';
const version='1234567890abcdef1234';
function match(id:string,overrides:Partial<Match>={}):Match{return {...mockMatches[0],match_id:id,tour:'atp',tournament:'Wimbledon',category:'Grand Slam',year:2024,surface:'grass',player1:{name:'A',seed:null},player2:{name:'B',seed:null},winner:1,status:'Finished',final_score:'4–6 4–6 6–3 6–3 6–3',score_summary:{...mockMatches[0].score_summary,games:[[4,6],[4,6],[6,3],[6,3],[6,3]],sets:[3,2]},statistics:[],point_tape:[],data_source:'api',context:{format:'BO5',date:'2024-07-14',dateLabel:'Fecha del partido'},...overrides}}
test('100 distinct research contracts; ATP and WTA never share numeric aggregates',()=>{
 assert.deepEqual(RESEARCH_RECIPES.map(r=>r.id),Array.from({length:100},(_,i)=>i+1));
 const products=calculateResearchProducts([match('atp'),match('wta',{tour:'wta',player1:{name:'C',seed:null},player2:{name:'D',seed:null},context:{format:'BO5'}})],version);
 assert.equal(products.length,200);assert.equal(products.find(p=>p.id===51&&p.tour==='atp')?.rows.find(r=>r.entity==='A')?.value,1);
 assert.ok(products.filter(p=>p.tour==='atp').every(p=>p.rows.every(r=>!r.proof.includes('wta'))));
 assert.ok(products.every(p=>p.absoluteRecordEligible===false));
});
test('date and rank absence blocks dependent products without manufacturing zeros',()=>{
 const products=calculateResearchProducts([match('x',{context:{format:'BO5',date:'2024-07-01',dateLabel:'Inicio del torneo'}})],version);
 for(const id of [8,41,94]){const p=products.find(p=>p.id===id&&p.tour==='atp')!;assert.equal(p.status,'blocked');assert.equal(p.rows.length,0)}
});
test('comeback and negative-game wins are calculated from the full score',()=>{
 const products=calculateResearchProducts([match('x',{score_summary:{...mockMatches[0].score_summary,games:[[0,6],[0,6],[7,6],[7,6],[7,6]]},final_score:'0–6 0–6 7–6 7–6 7–6'})],version);
 for(const id of [51,53,54])assert.equal(products.find(p=>p.id===id&&p.tour==='atp')?.rows.find(r=>r.entity==='A')?.value,1);
});
test('uncertified edition cannot produce a no-set-lost champion',()=>{
 const p=calculateResearchProducts([match('x')],version).find(p=>p.id===56&&p.tour==='atp')!;assert.equal(p.status,'blocked');
});
test('55 quality controls separate errors, warnings and unavailable evidence',()=>{
 const m=match('x');const report=auditResearchQuality([m]);assert.equal(report.controls,55);assert.equal(report.errorCount,0);
 const broken=auditResearchQuality([m,m]);assert.equal(broken.duplicateIds.length,1);assert.equal(broken.semanticDuplicates.length,1);
 const synthetic=auditResearchQuality([match('s',{context:{pointSource:'reconstructed'},point_tape:[{...mockMatches[0].point_tape[0]}]})]);assert.equal(synthetic.checks.find(r=>r.id===45)?.failed,1);
});
const observation=(publisher:string,origin=publisher):EvidenceObservation=>({claim:'winner',value:'A',publisher,origin,url:'https://'+publisher+'.example/result',capturedAt:'2026-11-11T12:00:00Z',sha256:'a'.repeat(64)});
test('three pages copied from one source are not three independent confirmations',()=>{
 assert.equal(evidenceConsensus([observation('one','feed'),observation('two','feed'),observation('three','feed')],'winner').status,'unresolved');
 assert.equal(evidenceConsensus([observation('one'),observation('two'),observation('three')],'winner').status,'corroborated');
 assert.equal(evidenceConsensus([observation('one','root-a'),observation('one','root-b'),observation('one','root-c'),observation('two','root-a'),observation('three','root-a')],'winner').status,'unresolved');
 const conflict={...observation('four'),value:'B'};assert.equal(evidenceConsensus([observation('one'),observation('two'),observation('three'),conflict],'winner').status,'unresolved');
});
test('Wikipedia evidence requires the captured revision',()=>{
 const wikipedia={...observation('wiki'),url:'https://en.wikipedia.org/wiki/Tennis'};
 assert.equal(evidenceConsensus([wikipedia],'winner').rejected.length,1);
 assert.equal(evidenceConsensus([{...wikipedia,revisionId:123}],'winner').rejected.length,0);
});
test('external milestones are isolated by circuit and preserve their scope',()=>{
 const evidence={verifiedEvents:[{tour:'atp' as const,entity:'A · títulos GS · 2024',value:2,detail:'Títulos individuales; temporada 2024',proof:['https://one.example/result','https://two.example/result']}]};
 const products=calculateResearchProducts([match('a'),match('w',{tour:'wta'})],version,evidence);
 const atp=products.find(p=>p.id===100&&p.tour==='atp')!;
 assert.equal(atp.status,'calculated-in-sample');assert.equal(atp.rows[0].value,2);assert.match(atp.rows[0].detail!,/2024/);
 const wta=products.find(p=>p.id===100&&p.tour==='wta')!;assert.equal(wta.status,'blocked');assert.deepEqual(wta.rows,[]);
});

test('unknown match format never turns a three-set straight win into a deciding set',()=>{
 const m=match('unknown-format',{final_score:'6–3 6–3 6–3',score_summary:{...mockMatches[0].score_summary,games:[[6,3],[6,3],[6,3]],sets:[3,0]},context:{date:'2024-07-14',dateLabel:'Fecha del partido'}});
 const p=calculateResearchProducts([m],version).find(p=>p.id===28&&p.tour==='atp')!;assert.equal(p.status,'blocked');assert.equal(p.rows.length,0);
});
test('complete-edition statistics cannot discard an earlier match with missing measurements',()=>{
 const earlier=match('semi',{round:'Semifinal',player2:{name:'C',seed:null},statistics:[],context:{format:'BO5',minutes:undefined}});
 const last=match('final',{round:'Final',context:{format:'BO5',minutes:150},statistics:[{category:'Return',name:'Break points converted',period:'ALL',player:2,value:'1',won:null,total:null},{category:'Service',name:'Service games played',period:'ALL',player:1,value:'15',won:null,total:null}]});
 const e={certifiedEditions:new Set(['atp|Wimbledon|Grand Slam|2024|'])};
 const products=calculateResearchProducts([earlier,last],version,e);
 for(const id of [82,91])assert.equal(products.find(p=>p.id===id&&p.tour==='atp')!.rows.length,0);
});
test('no semifinal date produces no measured semifinal-to-final interval',()=>{
 const p=calculateResearchProducts([match('only-final',{round:'Final'})],version).find(p=>p.id===81&&p.tour==='atp')!;assert.equal(p.rows.length,0);
});
