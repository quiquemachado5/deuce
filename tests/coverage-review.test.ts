import test from 'node:test';
import assert from 'node:assert/strict';
import type { Match, MatchStat } from '../lib/types';
import { mockMatches } from '../lib/mocks';
import { fieldCoverage } from '../lib/field-coverage';
import { reviewedFinals, referenceIssue, referenceScore } from '../lib/reviewed-finals';

const base = (): Match => ({ ...mockMatches[0], match_id: 'archive-test', year: 2022, statistics: [], point_tape: [], context: {}, quality: { result: 'consistent', tape: 'none' } });
const stat = (player: 1 | 2, value: number): MatchStat => ({ player, period: 'match', category: 'Service', name: 'Aces', value: String(value), won: value, total: null });

test('field audit counts each match once, preserves zero and excludes absent or invalid values', () => {
  const first = { ...base(), statistics: [stat(1, 0), stat(1, 0), stat(2, 4)], context: { minutes: 80, rankLabel: 'Ranking en la descarga', rank1: 1 } };
  const second = { ...base(), match_id: 'live-test', year: 2026, statistics: [stat(1, 5)], context: { age1: 23, age2: 25, rankLabel: 'Ranking al jugar', rank2: 2 } };
  const missing = { ...base(), statistics: [stat(1, -1), { ...stat(2, 4), value: '', won: null }], context: { minutes: 999 } };
  const report = fieldCoverage([first, second, missing]);
  const aces = report.measures.find(row => row.id === 'Aces')!;
  assert.equal(aces.matches, 2);
  assert.equal(aces.both, 1);
  assert.equal(aces.historical, 1);
  assert.equal(aces.recent, 1);
  assert.deepEqual(aces.years, [2022, 2026]);
  assert.equal(report.context.find(row => row.id === 'ranking')?.matches, 1);
  assert.equal(report.context.find(row => row.id === 'minutes')?.matches, 1);
  assert.equal(report.reliable + report.partial + report.none, report.total);
  assert.equal(fieldCoverage([base()]).measures.length, 0);
});

test('every reviewed final validates either orientation and fills only undocumented tie-breaks', () => {
  for (const reference of reviewedFinals) {
    const games = reference.score.split(' ').map(set => set.match(/^(\d+)–(\d+)/)!.slice(1).map(Number));
    for (const reversed of [false, true]) {
      const match: Match = { ...base(), tournament: reference.tournament, year: reference.year, round: 'Final', player1: { name: reversed ? reference.loser : reference.winner, seed: null }, player2: { name: reversed ? reference.winner : reference.loser, seed: null }, winner: reversed ? 2 : 1, score_summary: { ...base().score_summary, games: games.map(set => reversed ? [...set].reverse() : set) }, final_score: reference.score.split(' ').map(set => reversed ? set.replace(/^(\d+)–(\d+)/, '$2–$1') : set).join(' ') };
      assert.equal(referenceIssue(match), null, reference.tournament + reference.year);
      const noTies = { ...match, final_score: match.final_score.replace(/\(\d+\)/g, '') };
      assert.equal(referenceIssue(noTies), null);
      assert.equal(referenceScore(noTies), match.final_score);
      assert.ok(referenceIssue({ ...match, winner: reversed ? 1 : 2 }));
      if (match.final_score.includes('(')) assert.ok(referenceIssue({ ...match, final_score: match.final_score.replace(/\(\d+\)/, '(99)') }));
    }
  }
});

test('coverage discovers numeric fields beyond the old ten-stat whitelist', () => {
  const report = fieldCoverage([{ ...base(), statistics: [
    { ...stat(1, 0), name: 'Consecutive points won' },
    { ...stat(2, 6), name: 'Consecutive points won' },
    { ...stat(1, 4), name: 'Service games played' },
    { ...stat(1, 9), name: 'Set-only field', period: 'set1' },
  ] }]);
  assert.equal(report.measures.find(row => row.id === 'Consecutive points won')?.both, 1);
  assert.equal(report.measures.find(row => row.id === 'Service games played')?.matches, 1);
  assert.ok(!report.measures.some(row => row.id === 'Set-only field'));
});
