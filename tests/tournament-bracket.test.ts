import assert from 'node:assert/strict';
import test from 'node:test';
import { mockMatches } from '../lib/mocks';
import { tournamentBracketRounds } from '../lib/tournament-bracket';

test('interactive tournament brackets receive compact records instead of detailed matches', () => {
  const detailed = {
    ...mockMatches[0],
    match_id: 'bracket-final',
    round: 'Final',
    tournament: 'Example',
    year: 2026,
    player1: { name: 'Champion', seed: null },
    player2: { name: 'Finalist', seed: null },
    winner: 1 as const,
  };
  const semifinal = {
    ...detailed,
    match_id: 'bracket-semi',
    round: 'Semifinal',
    player2: { name: 'Semifinalist', seed: null },
  };

  const rounds = tournamentBracketRounds([semifinal, detailed]);

  assert.deepEqual(
    rounds.map(round => [round.position, round.label, round.results[0].champion]),
    [[6, 'Semifinal', 'Champion'], [7, 'Final', 'Champion']],
  );
  const serialized = JSON.stringify(rounds);
  for (const privateField of ['point_tape', 'statistics', 'raw_fixture', 'raw_point_tape']) {
    assert.equal(serialized.includes(privateField), false);
  }
  assert.ok(serialized.length < JSON.stringify([semifinal, detailed]).length / 5);
});
