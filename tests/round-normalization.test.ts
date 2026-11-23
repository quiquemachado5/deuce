import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRound,roundLabel,roundPosition} from '../lib/editorial';

test('provider round aliases resolve to one stable archive vocabulary',()=>{
  const cases=[['F',7,'Final'],['SF',6,'Semifinal'],['QF',5,'Cuartos de final'],['R16',4,'Octavos de final'],['3R',3,'Tercera ronda'],['R64',2,'Segunda ronda'],['1R',1,'Primera ronda'],['Round Robin',.5,'RR']] as const;
  for(const [input,position,label] of cases){assert.equal(roundPosition(input),position,input);assert.equal(roundLabel(input),label,input);}
  assert.equal(normalizeRound('third place'),'BR');assert.equal(roundPosition('third place'),6.5);
});
