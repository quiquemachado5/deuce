import assert from 'node:assert/strict';
import test from 'node:test';
import { mockMatches } from '../lib/mocks';
import { playerTrends } from '../lib/player-trends';
import type { Match } from '../lib/types';

const matches: Match[] = Array.from({ length: 9 }, (_, index) => ({
  ...mockMatches[0],
  match_id: `trend-${index}`,
  year: 2015 + index,
  category: index < 5 ? 'Grand Slam' : 'ATP 500',
  player1: { name: 'Trend Player', seed: null },
  player2: { name: `Rival ${index}`, seed: null },
  winner: index % 3 ? 1 : 2,
}));

test('player trends separate category and career-stage samples', () => {
  const result = playerTrends(matches, 'Trend Player');
  assert.deepEqual(result.categories.map(row => row.label), ['Grand Slam', 'ATP 500']);
  assert.equal(result.stages.length, 3);
  assert.equal(result.stages.reduce((sum, row) => sum + row.played, 0), matches.length);
  assert.match(result.stages[0].label, /^Inicio/);
});
