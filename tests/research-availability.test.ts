import test from 'node:test';
import assert from 'node:assert/strict';
import {auditAvailability} from '../lib/research/availability';
import type {Match} from '../lib/types';
const fixture=(overrides:Partial<Match>={}):Match=>({match_id:'a',tour:'atp',year:2024,category:'Grand Slam',round:'Final',player1:{name:'A',seed:null},player2:{name:'B',seed:null},surface:'hard',context:{date:'2024-01-01',dateLabel:'Inicio del torneo',rank1:1,rank2:2},statistics:[],point_tape:[],...overrides} as Match);
test('keeps missing enrichment in denominators and does not promote event dates or current rankings',()=>{
 const report=auditAvailability([fixture(),fixture({match_id:'b',context:{date:'2024-02-02',dateLabel:'Fecha del partido',rankLabel:'Ranking al jugar',rank1:2,rank2:3,minutes:90,format:'BO5'}})]);
 const atp=report.cohorts.find(c=>c.dimension==='tour'&&c.key==='atp')!;
 assert.equal(atp.matches,2);assert.equal(atp.available['exact-date'],1);assert.equal(atp.available['ranking-at-match'],1);assert.equal(atp.available.duration,1);assert.equal(atp.available['measured-statistics'],0);
});
test('separates circuits and distinguishes player appearances from match denominators',()=>{
 const report=auditAvailability([fixture(),fixture({tour:'wta'})]);
 assert.deepEqual(report.cohorts.filter(c=>c.dimension==='tour').map(c=>[c.key,c.matches]),[['atp',1],['wta',1]]);
 assert.equal(report.cohorts.filter(c=>c.dimension==='player').length,4);
 assert.equal(report.cohorts.filter(c=>c.dimension==='tour').reduce((sum,c)=>sum+c.matches,0),2);
});
