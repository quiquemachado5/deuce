import assert from 'node:assert/strict';
import test from 'node:test';
import { hasProviderStatistics, mergeProviderStatistics, providerPlayersFromDetail } from '../lib/provider-statistics';

test('normalizes a dedicated statistics payload without replacing detail data', () => {
  const merged = mergeProviderStatistics(
    { match: { id: 42 }, tape: [{ winner: 1 }] },
    { data: { players: { p1: { aces: 8 }, p2: { aces: 4 } }, source: 'derived' } },
  );
  assert.deepEqual(merged.match, { id: 42 });
  assert.deepEqual((merged.stats as Record<string, unknown>).players, { p1: { aces: 8 }, p2: { aces: 4 } });
  assert.equal(hasProviderStatistics(merged), true);
});

test('leaves a detail untouched when the response has no documented players', () => {
  const detail = { match: { id: 42 } };
  assert.deepEqual(mergeProviderStatistics(detail, { data: [] }), detail);
  assert.equal(hasProviderStatistics(detail), false);
});

test('extracts provider player IDs without crossing circuits', () => {
  assert.deepEqual(providerPlayersFromDetail({ match: { players: {
    p1: { id: 23, name: 'Rafael Jodar', tour: 'atp' },
    p2: { id: 537, name: 'Casper Ruud' },
  } } }, 'atp'), [
    { id: '23', name: 'Rafael Jodar', tour: 'atp' },
    { id: '537', name: 'Casper Ruud', tour: 'atp' },
  ]);
});
