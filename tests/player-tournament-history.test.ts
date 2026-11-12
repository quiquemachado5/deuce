import test from 'node:test';
import assert from 'node:assert/strict';
import {playerTournamentEditions} from '../lib/player-tournament-history';
import {mockMatches} from '../lib/mocks';
import type {Match} from '../lib/types';
const match=(year:number,round:string,winner:1|2,tour:'atp'|'wta'='atp'):Match=>({...mockMatches[0],tour,year,round,winner,category:'Grand Slam',player1:{name:'Rafael Nadal',seed:null},player2:{name:'Opponent',seed:null}});
test('edition history reports the furthest documented result without inventing absent years',()=>{
  const rows=playerTournamentEditions([match(2005,'Semifinal',1),match(2005,'Final',1),match(2007,'Final',2),match(2009,'Cuartos de final',2)],'Rafael Nadal','atp');
  assert.deepEqual(rows.map(x=>[x.year,x.outcome,x.code]),[[2005,'title','G'],[2007,'final','F'],[2009,'quarter','CF']]);
  assert.equal(rows[0].label,'Ganador');
});
test('edition history cannot import results from another circuit or another player',()=>{
  const rows=playerTournamentEditions([match(2024,'Final',1,'wta'),match(2025,'Final',1)],'Rafael Nadal','wta');
  assert.deepEqual(rows.map(x=>x.year),[2024]);
  assert.equal(rows[0].label,'Ganadora');
  assert.deepEqual(playerTournamentEditions([match(2024,'Final',1)],'Roger Federer','atp'),[]);
});
