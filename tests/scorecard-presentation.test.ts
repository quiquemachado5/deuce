import assert from 'node:assert/strict';
import test from 'node:test';
import { scorecardPresentation } from '../lib/scorecard-presentation';
import { resolvedSetClosed,resolvedWinner } from '../lib/deuce-score';
import cases from '../app/laboratorio/marcadores/cases.json';
import type { MatchRecord } from '../types/deuce';

test('the shared scorecard classifies finals, semifinals and quarterfinals independently',()=>{
  const match=cases[0].match as MatchRecord;
  for(const [round,tone] of [['Final','final'],['Semifinales','semi'],['SF','semi'],['Cuartos de final','quarter'],['QF','quarter'],['Ronda de 32','regular']])assert.equal(scorecardPresentation({...match,round}).tone,tone);
});

test('five-set historical final preserves every score and all three tie-breaks',()=>{
  const match=cases[0].match as MatchRecord;
  assert.equal(match.sets.length,5);
  assert.equal(match.sets.filter(s=>s.tieBreak?.some(n=>n!=null)).length,3);
  assert.deepEqual(match.sets[4].games,[13,12]);
  assert.equal(resolvedSetClosed(match.sets[4]),true);
  assert.equal(resolvedWinner(match),0);
  assert.equal(scorecardPresentation(match).dateTime,'2019-07-14');
});

test('walkovers never synthesize a played score and retirements keep their open set',()=>{
  const walkover=cases.find(c=>c.match.status==='walkover')!.match as MatchRecord;
  const retired=cases.find(c=>c.match.status==='retired')!.match as MatchRecord;
  assert.deepEqual(walkover.sets,[]);
  assert.equal(scorecardPresentation(walkover).status,'W/O · Sin disputa');
  assert.equal(scorecardPresentation(retired).status,'Abandono');
  assert.equal(resolvedSetClosed(retired.sets.at(-1)!),false);
});

test('unreviewed historical dates stay approximate and circuit categories are not repeated',()=>{
  const match=cases.find(c=>c.match.dateLabel==='Inicio del torneo')!.match as MatchRecord;
  assert.match(scorecardPresentation(match).date,/^Semana del /);
  assert.equal(scorecardPresentation(match).dateTime,undefined);
  assert.equal(scorecardPresentation({...match,dateLabel:undefined}).date,`Edición ${match.year}`);
  assert.equal(scorecardPresentation({...match,tour:'wta',category:'WTA 250'}).category,'250');
  assert.equal(scorecardPresentation({...match,tour:'wta',category:'WTA 1000'}).category,'WTA 1000');
});


test('round labels show the specific documented stage without guessing a draw size',()=>{
  const match=cases[0].match as MatchRecord;
  for(const [source,label] of [['R128','Ronda de 128'],['R64','Ronda de 64'],['R32','Ronda de 32'],['R16','Octavos de final'],['QF','Cuartos de final'],['SF','Semifinal'],['RR','Fase de grupos'],['Q2','Previa · ronda 2'],['Primera ronda','Primera ronda']]){
    assert.equal(scorecardPresentation({...match,round:source}).round,label);
  }
});
