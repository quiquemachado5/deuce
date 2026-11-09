import assert from 'node:assert/strict';
import test from 'node:test';
import { mockMatches } from '../lib/mocks';
import { setAnalytics } from '../lib/set-analytics';
import type { Match, Point } from '../lib/types';

function point(set: number, pointNumber: number, winner: 1 | 2, converted = false): Point {
  return {
    set, game: 1, point_number: pointNumber, server: 1, score: '', winner,
    rally_length: null, is_ace: null, is_double_fault: null,
    is_break_point: converted, break_converted: converted,
    is_match_point: null, first_serve_in: null,
  };
}

test('set analytics derives only documented per-set evidence', () => {
  const match: Match = {
    ...mockMatches[0],
    quality: { result: 'consistent', tape: 'reliable' },
    score_summary: { ...mockMatches[0].score_summary, games: [[6, 4], [3, 6]] },
    point_tape: [
      ...[1, 1, 2, 1, 1, 2, 2, 1, 1, 1].map((winner, index) => point(1, index + 1, winner as 1 | 2, index === 4)),
      ...[2, 2, 1, 2, 2, 1, 2, 1, 2, 2].map((winner, index) => point(2, index + 11, winner as 1 | 2, index === 6)),
    ],
  };
  const rows = setAnalytics(match);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].points, [7, 3]);
  assert.deepEqual(rows[0].breaks, [1, 0]);
  assert.deepEqual(rows[0].longestRun, [3, 2]);
  assert.deepEqual(rows[1].games, [3, 6]);
});

test('set analytics never estimates from score-only or partial matches', () => {
  assert.deepEqual(setAnalytics({ ...mockMatches[0], point_tape: [], quality: { result: 'consistent', tape: 'none' } }), []);
  assert.deepEqual(setAnalytics({ ...mockMatches[0], quality: { result: 'consistent', tape: 'partial' } }), []);
});
