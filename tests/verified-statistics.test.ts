import test from 'node:test';
import assert from 'node:assert/strict';
import { statisticRegistry, statisticVerification, verifiedStatistics } from '../lib/verified-statistics';
import { observedSlamStageSequence, observedTournamentTitles } from '../lib/reference-statistics-audit';
import { mockMatches } from '../lib/mocks';
import type { Match } from '../lib/types';

test('every published reference fact meets its independent-page threshold; ATP and WTA remain separate', () => {
  for (const fact of statisticRegistry.facts) assert.equal(statisticVerification(fact, statisticRegistry.sources).accepted, true, fact.id);
  assert.ok(verifiedStatistics('atp').every(fact => fact.tour === 'atp'));
  assert.ok(verifiedStatistics('wta').every(fact => fact.tour === 'wta'));
  assert.ok(verifiedStatistics('atp').length >= 6 && verifiedStatistics('wta').length >= 4);
});
test('two pages, copied publishers, different definitions, conflicting values and unreviewed claims cannot publish', () => {
  const fact = structuredClone(statisticRegistry.facts[0]);
  assert.equal(statisticVerification({ ...fact, observations: fact.observations.slice(0, 2) }, statisticRegistry.sources).accepted, false);
  const copied = structuredClone(statisticRegistry.sources);
  for (const observation of fact.observations) copied[observation.source].publisher = 'One publisher';
  assert.equal(statisticVerification(fact, copied).accepted, false);
  for (const field of ['value', 'scope', 'unit'] as const) {
    const conflict = structuredClone(fact);
    Object.assign(conflict.observations[0], { [field]: field === 'value' ? 99 : 'another definition' });
    assert.equal(statisticVerification(conflict, statisticRegistry.sources).accepted, false);
  }
  assert.equal(statisticVerification({ ...fact, status: 'pending' }, statisticRegistry.sources).accepted, false);
});
test('syndication, tracking URLs and missing immutable Wikipedia revisions are not new corroboration', () => {
  const fact = structuredClone(statisticRegistry.facts[0]);
  const copied = structuredClone(statisticRegistry.sources);
  for (const observation of fact.observations) copied[observation.source].origin = 'same-agency-dispatch';
  assert.equal(statisticVerification(fact, copied).accepted, false);
  const missingRevision = structuredClone(statisticRegistry.sources);
  delete missingRevision['federer-wiki'].revision;
  assert.equal(statisticVerification(fact, missingRevision).accepted, false);
  const mutable = structuredClone(statisticRegistry.sources);
  mutable['federer-wiki'].url = 'https://en.wikipedia.org/wiki/Roger_Federer';
  assert.equal(statisticVerification(fact, mutable).accepted, false);
  const samePage = structuredClone(statisticRegistry.sources);
  fact.observations.forEach((observation, i) => { samePage[observation.source].url = 'https://example.com/story?tracking=' + i + '#part' + i; });
  assert.equal(statisticVerification(fact, samePage).accepted, false);
});
const base = mockMatches.find(match => match.category === 'Grand Slam')!;
function fixture(id: string, year: number, tournament: string, tour: Tour = 'atp'): Match {
  return { ...base, match_id: id, tour, year, tournament, category: 'Grand Slam', round: 'Final', status: 'Finished', winner: 1,
    player1: { name: 'Player A', seed: null }, player2: { name: 'Player B', seed: null }, statistics: [], point_tape: [],
    score_summary: { ...base.score_summary, games: [[6, 3], [6, 4], [6, 4]], sets: [3, 0] } };
}
type Tour = 'atp' | 'wta';
test('an absent Slam breaks a calendar streak, duplicates and the other circuit cannot fill it', () => {
  const a = fixture('a', 2010, 'Wimbledon'), b = fixture('b', 2010, 'US Open');
  const start = { year: 2010, tournament: 'Wimbledon' }, end = { year: 2010, tournament: 'US Open' };
  assert.equal(observedSlamStageSequence([a, a, b], 'atp', 'Player A', start, end, 6).observed, 2);
  const gap = observedSlamStageSequence([a, { ...b, tour: 'wta' }], 'atp', 'Player A', start, end, 6);
  assert.equal(gap.matched, false); assert.equal(gap.observed, 1);
  assert.equal(observedSlamStageSequence([a, { ...b, context: { qualifying: true } }], 'atp', 'Player A', start, end, 6).matched, false);
});
test('the 2020 calendar has three majors in the correct order; titles count one final per edition', () => {
  const rows = [fixture('ao', 2020, 'Australian Open'), fixture('us', 2020, 'US Open'), fixture('rg', 2020, 'Roland Garros')];
  const result = observedSlamStageSequence(rows, 'atp', 'Player A', { year: 2020, tournament: 'Australian Open' }, { year: 2020, tournament: 'Roland Garros' }, 7);
  assert.equal(result.expectedEditions, 3); assert.deepEqual(result.evidence, ['ao', 'us', 'rg']);
  assert.throws(() => observedSlamStageSequence(rows, 'atp', 'Player A', { year: 2020, tournament: 'Wimbledon' }, { year: 2020, tournament: 'Roland Garros' }, 6), /cancelled/);
  assert.equal(observedTournamentTitles([...rows, rows[2], { ...rows[2], tour: 'wta' }], 'atp', 'Player A', 'Roland Garros', 2020, 2020).value, 1);
});

// The two-page policy is explicit per claim; a syndicated copy is not corroboration.
test('an explicitly reviewed addition needs two matching independent sources', () => {
 const fact = structuredClone(statisticRegistry.facts.find(f => f.minimumSources === 2)!);
 assert.ok(fact);
 assert.equal(statisticVerification(fact, statisticRegistry.sources).accepted, true);
 assert.equal(statisticVerification({...fact, observations:fact.observations.slice(0,1)},statisticRegistry.sources).accepted,false);
 const copied=structuredClone(statisticRegistry.sources);
 copied[fact.observations[1].source].origin=copied[fact.observations[0].source].origin;
 assert.equal(statisticVerification(fact,copied).accepted,false);
});
