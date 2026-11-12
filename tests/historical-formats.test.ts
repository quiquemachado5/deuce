import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalFormat} from '../lib/historical-formats';
import {prepareMatch,eligibleMatch} from '../lib/quality';
import {mockMatches} from '../lib/mocks';
test('historical format exceptions are scoped by tournament, circuit, year and round',()=>{
  const m={...mockMatches[0],tour:'atp' as const,category:'Grand Slam',tournament:'Roland Garros',year:1974,round:'Ronda de 64',winner:1 as const,status:'Finished',final_score:'6–2 6–3',score_summary:{...mockMatches[0].score_summary,games:[[6,2],[6,3]]},context:{format:'BO5'},point_tape:[],statistics:[]};
  assert.equal(eligibleMatch(prepareMatch(m)),true);
  assert.equal(eligibleMatch(prepareMatch({...m,round:'Final'})),false);
  assert.equal(historicalFormat({...m,tour:'wta'}),null);
  assert.equal(historicalFormat({...m,year:1976})?.bestOf,5);
  assert.equal(historicalFormat({...m,tournament:'US Open',year:1977,round:'Octavos de final'})?.bestOf,3);
  assert.equal(historicalFormat({...m,tournament:'US Open',year:1978,round:'Octavos de final'})?.bestOf,5);
});
