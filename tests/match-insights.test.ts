import assert from 'node:assert/strict';
import test from 'node:test';
import { matchInsights } from '../lib/match-insights';
import type { Match, Point } from '../lib/types';

const point = (winner: 1 | 2, number: number, pressure = false): Point => ({
  set: 1, game: 1, point_number: number, server: 1, score: '', winner,
  rally_length: null, is_ace: null, is_double_fault: null,
  is_break_point: pressure, break_converted: pressure ? winner === 2 : null,
  is_match_point: false, first_serve_in: null,
});

function fixture(): Match {
  return {
    match_id: 'test', tournament: 'Test', surface: 'hard', category: 'ATP 500', year: 2026,
    player1: { name: 'Uno', seed: null }, player2: { name: 'Dos', seed: null },
    score_summary: { sets: [2, 0], games: [[6, 4], [6, 4]], points: [], server: null, is_tiebreak: false, win_probability_p1: null, timestamp: '' },
    final_score: '6–4 6–4', round: 'Final', winner: 1, status: 'Finished', data_source: 'api',
    quality: { result: 'consistent', tape: 'reliable' },
    point_tape: [1,1,1,2,2,1,2,2,2,2,1,2].map((winner, index) => point(winner as 1 | 2, index + 1, index === 3 || index === 9)),
    statistics: [
      { player: 1, period: 'match', category: 'Golpes', name: 'Golpes ganadores', value: '18', won: 18, total: null },
      { player: 1, period: 'match', category: 'Errores', name: 'Errores no forzados', value: '12', won: 12, total: null },
      { player: 2, period: 'match', category: 'Golpes', name: 'Golpes ganadores', value: '14', won: 14, total: null },
      { player: 2, period: 'match', category: 'Errores', name: 'Errores no forzados', value: '17', won: 17, total: null },
      { player: 1, period: 'match', category: 'Return', name: 'Return points won', value: '36%', won: 18, total: 50 },
      { player: 2, period: 'match', category: 'Return', name: 'Return points won', value: '30%', won: 15, total: 50 },
      { player: 1, period: 'match', category: 'Breaks', name: 'Break points saved', value: '67%', won: 4, total: 6 },
      { player: 2, period: 'match', category: 'Breaks', name: 'Break points saved', value: '50%', won: 2, total: 4 },
      { player: 1, period: 'match', category: 'Breaks', name: 'Break points converted', value: '50%', won: 2, total: 4 },
      { player: 2, period: 'match', category: 'Breaks', name: 'Break points converted', value: '33%', won: 2, total: 6 },
    ],
  };
}

test('derives documented point runs, pressure, dominance and winner/error balance', () => {
  const rows = matchInsights(fixture());
  assert.deepEqual(rows.map(row => row.key), ['point-run', 'pressure-points', 'dominance-ratio', 'break-pressure', 'winner-error-balance']);
  assert.equal(rows[0].first.main, '3');
  assert.equal(rows[0].second.main, '4');
  assert.equal(rows[1].first.detail, '0 de 2');
  assert.equal(rows[2].first.main, '1,20×');
  assert.equal(rows[3].first.main, '58%');
  assert.equal(rows[4].first.main, '+6');
});

test('does not infer point-tape metrics from a partial sample', () => {
  const match = fixture();
  match.quality = { result: 'consistent', tape: 'partial' };
  const rows = matchInsights(match);
  assert.deepEqual(rows.map(row => row.key), ['dominance-ratio', 'break-pressure', 'winner-error-balance']);
});

test('derives tie-break wins from the documented set score', () => {
  const match = fixture();
  match.score_summary.games = [[7, 6], [6, 4]];
  const row = matchInsights(match).find((item) => item.key === 'tiebreaks');
  assert.equal(row?.first.main, '1');
  assert.equal(row?.second.main, '0');
});

test('reconciles split provider totals and derives advanced control measures', () => {
  const match = fixture();
  for (const stat of match.statistics.filter((item) => item.name === 'Return points won')) stat.total = null;
  match.statistics.push(
    { player: 1, period: 'match', category: 'Points', name: 'Total points won', value: '72', won: 72, total: null },
    { player: 2, period: 'match', category: 'Points', name: 'Total points won', value: '68', won: 68, total: null },
    { player: 1, period: 'match', category: 'Return', name: 'Return points played', value: '50', won: 50, total: null },
    { player: 2, period: 'match', category: 'Return', name: 'Return points played', value: '50', won: 50, total: null },
    { player: 1, period: 'match', category: 'Service', name: 'Aces', value: '8', won: 8, total: null },
    { player: 2, period: 'match', category: 'Service', name: 'Aces', value: '4', won: 4, total: null },
    { player: 1, period: 'match', category: 'Service', name: 'Double Faults', value: '2', won: 2, total: null },
    { player: 2, period: 'match', category: 'Service', name: 'Double Faults', value: '3', won: 3, total: null },
    { player: 1, period: 'match', category: 'Breaks', name: 'Break points played', value: '7', won: 7, total: null },
    { player: 2, period: 'match', category: 'Breaks', name: 'Break points played', value: '5', won: 5, total: null },
    { player: 1, period: 'match', category: 'Service', name: '1st serve points won', value: '36 / 50', won: 36, total: 50 },
    { player: 2, period: 'match', category: 'Service', name: '1st serve points won', value: '33 / 50', won: 33, total: 50 },
    { player: 1, period: 'match', category: 'Service', name: '2nd serve points won', value: '12 / 25', won: 12, total: 25 },
    { player: 2, period: 'match', category: 'Service', name: '2nd serve points won', value: '13 / 25', won: 13, total: 25 },
  );
  const rows = new Map(matchInsights(match).map((row) => [row.key, row]));
  assert.equal(rows.get('point-margin')?.first.main, '+4');
  assert.equal(rows.get('dominance-ratio')?.first.main, '1,20×');
  assert.equal(rows.get('serve-balance')?.first.main, '+6');
  assert.equal(rows.get('break-chances')?.second.main, '5');
  assert.equal(rows.get('first-serve-lift')?.first.main, '+24 pp');
  assert.equal(rows.get('first-serve-lift')?.neutral, true);
});

test('publishes rally measures only from a reliable measured tape', () => {
  const match = fixture();
  match.point_tape.forEach((item, index) => { item.rally_length = [3, 5, 9, 12, 4, 10][index % 6]; });
  const rows = new Map(matchInsights(match).map((row) => [row.key, row]));
  assert.ok(rows.has('rally-length'));
  assert.ok(rows.has('long-rallies'));
  match.quality = { result: 'consistent', tape: 'partial' };
  const partial = new Set(matchInsights(match).map((row) => row.key));
  assert.equal(partial.has('rally-length'), false);
  assert.equal(partial.has('long-rallies'), false);
});
