import assert from 'node:assert/strict';
import test from 'node:test';
import { mockMatches } from '../lib/mocks';
import { isPublishedMatch, PROVIDER_PUBLICATION_TIERS, publishedMatchDuplicateKey, publishedMatches } from '../lib/publication-scope';
import type { Match } from '../lib/types';

function result(overrides: Partial<Match> = {}): Match {
  return {
    ...mockMatches[0],
    match_id: 'scope-atp',
    tour: 'atp',
    category: 'ATP 500',
    context: { ...mockMatches[0].context, date: '2026-10-20', dateLabel: 'Fecha del partido', format: 'BO3' },
    ...overrides,
  };
}

test('the public universe contains only the requested singles tiers for each circuit', () => {
  for (const category of ['Grand Slam', 'Masters 1000', 'ATP 500', 'ATP 250']) assert.equal(isPublishedMatch(result({ category })), true, category);
  for (const category of ['ATP Tour · nivel no especificado', 'Precursores de Masters', 'ATP Finals']) assert.equal(isPublishedMatch(result({ category })), false, category);
  for (const category of ['Grand Slam', 'WTA 1000', 'WTA 500', 'WTA 250']) assert.equal(isPublishedMatch(result({ tour: 'wta', category })), true, category);
  for (const category of ['WTA 125', 'Circuito ITF femenino', 'WTA Tour histórico']) assert.equal(isPublishedMatch(result({ tour: 'wta', category })), false, category);
  assert.equal(isPublishedMatch(result({ player1: { name: 'A / B', seed: null } })), false);
  assert.equal(PROVIDER_PUBLICATION_TIERS.wta.includes('wta_125'), false);
});

test('semantic duplicates keep the richest deterministic result', () => {
  const summary = result({ match_id: 'provider-b', statistics: [], point_tape: [] });
  const detailed = result({ match_id: 'provider-a', statistics: [{ player: 1, period: 'match', category: 'Service', name: 'Aces', value: '4', won: 4, total: null }] });
  assert.equal(publishedMatchDuplicateKey(summary), publishedMatchDuplicateKey(detailed));
  assert.deepEqual(publishedMatches([summary, detailed]).map(match => match.match_id), ['provider-a']);
  const otherDay = result({ match_id: 'provider-c', context: { ...summary.context, date: '2026-10-21' } });
  assert.equal(publishedMatches([summary, otherDay]).length, 2);
});

test('semantic duplicates remain identical when the provider reverses player order', () => {
  const forward = result({
    match_id: 'provider-forward',
    player1: { name: 'Alice Example', seed: null },
    player2: { name: 'Bob Example', seed: null },
    winner: 1,
    final_score: '6–4 7–6(5)',
    score_summary: { ...mockMatches[0].score_summary, games: [[6, 4], [7, 6]], sets: [2, 0] },
  });
  const reversed = result({
    match_id: 'provider-reversed',
    player1: { name: 'Bob Example', seed: null },
    player2: { name: 'Alice Example', seed: null },
    winner: 2,
    final_score: '4–6 6–7(5)',
    score_summary: { ...mockMatches[0].score_summary, games: [[4, 6], [6, 7]], sets: [0, 2] },
  });
  assert.equal(publishedMatchDuplicateKey(forward), publishedMatchDuplicateKey(reversed));
  assert.deepEqual(publishedMatches([reversed, forward]).map(match => match.match_id), ['provider-forward']);
});
