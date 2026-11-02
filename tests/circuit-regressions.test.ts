import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  comparisonArchiveHref,
  comparisonPageHref,
  comparisonSearchUrl,
  findCircuitMatch,
} from '../lib/match-comparison';

test('match comparison carries its circuit through search and navigation', () => {
  assert.equal(comparisonSearchUrl('Sabalenka', 'wta'), '/api/search?tour=wta&q=Sabalenka');
  assert.equal(comparisonArchiveHref('wta'), '/buscar?tour=wta');
  assert.equal(comparisonPageHref('wta-123', 'wta'), '/compare?left=wta-123&tour=wta');
});

test('match comparison rejects a second match from the opposite circuit', () => {
  const matches = [
    { match_id: 'legacy-atp' },
    { match_id: 'atp-1', tour: 'atp' as const },
    { match_id: 'wta-1', tour: 'wta' as const },
  ];
  assert.equal(findCircuitMatch(matches, 'wta-1', 'wta')?.match_id, 'wta-1');
  assert.equal(findCircuitMatch(matches, 'atp-1', 'wta'), null);
  assert.equal(findCircuitMatch(matches, 'legacy-atp', 'atp')?.match_id, 'legacy-atp');
});

test('pending shell navigation does not expose ATP section links', () => {
  const fallback = readFileSync(new URL('../components/deuce/CircuitNavigationFallback.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(fallback, /href=["'{`]\/(buscar|records|jugadores|torneos|comparar)/);
  assert.match(fallback, /data-circuit-navigation="pending"/);
});
