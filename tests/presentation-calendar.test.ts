import test from 'node:test';
import assert from 'node:assert/strict';
import {careerSeasonPosition, calendarPosition} from '../lib/presentation-calendar';
import type {TournamentEntry} from '../lib/tournament-directory';
test('career Grand Slams use the season sequence regardless of a moved edition or circuit',()=>{
 for(const tour of ['atp','wta']){
  assert.ok(tour === 'atp' || tour === 'wta');
  const names=['US Open','Wimbledon','Australian Open','Roland Garros'];
  assert.deepEqual(names.sort((a,b)=>careerSeasonPosition(a,10)-careerSeasonPosition(b,10)),['Australian Open','Roland Garros','Wimbledon','US Open']);
 }
});
test('other career tournaments prefer documented circuit dates over fallback names',()=>{
 assert.ok(careerSeasonPosition('Indian Wells')<careerSeasonPosition('Miami'));
 assert.ok(careerSeasonPosition('Rome')<careerSeasonPosition('Canada'));
 assert.equal(careerSeasonPosition('Madrid',10.12),10.12);
 assert.equal(careerSeasonPosition('Unknown',NaN),13);
 const fixture={name:'Madrid',latestYear:2026,matches:[{year:2025,context:{date:'2025-01-02'}},{year:2026,context:{date:'2026-04-23'}},{year:2026,context:{date:'2026-04-20'}}]} as TournamentEntry;
 assert.equal(calendarPosition(fixture),4.2);
});
