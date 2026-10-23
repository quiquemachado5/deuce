import test from 'node:test';
import assert from 'node:assert/strict';
import { mockMatches } from '../lib/mocks';
import type { Match, MatchStat } from '../lib/types';
import { recordCatalog, groupDescriptions } from '../lib/revista/records';
import { additionalRecords } from '../lib/revista/additional-records';
import { detailRefreshPlan } from '../lib/detail-refresh-plan';
import { recordEvidence } from '../lib/record-evidence';

function fixture(index: number, winner: 1 | 2 = 1): Match {
  return { ...mockMatches[0], match_id: `test-${index}`, tournament: 'Test', category: 'ATP 250', round: 'Final', year: 2026, surface: 'hard',
    player1: { name: 'Jugador A', seed: null }, player2: { name: 'Jugador B', seed: null }, status: 'finished', winner,
    score_summary: { ...mockMatches[0].score_summary, games: winner === 1 ? [[6,4],[6,4]] : [[4,6],[4,6]], sets: winner === 1 ? [2,0] : [0,2] },
    final_score: winner === 1 ? '6–4 6–4' : '4–6 4–6', statistics: [], point_tape: [], context: { format: 'BO3' } };
}
test('new rates use exact denominators, minimum samples and fresh results', () => {
  const matches = Array.from({ length: 20 }, (_, i) => fixture(i, i < 13 ? 1 : 2));
  const piece = recordCatalog(matches, new Date(), 'efectividad-partidos')[0];
  assert.equal(piece.rows[0].name, 'Jugador A');
  assert.equal(piece.rows[0].value, 65);
  assert.equal(piece.rows[0].sample, 20);
  assert.equal(piece.sample, 20);
  assert.equal(recordCatalog(matches.slice(0,19), new Date(), 'efectividad-partidos').length, 0);
  const changed = recordCatalog([...matches, fixture(20, 2)], new Date(), 'efectividad-partidos')[0];
  assert.equal(changed.rows[0].value, 13 / 21 * 100);
  assert.equal(new Set(additionalRecords.map(spec => spec.id)).size, 25);
  assert.ok(additionalRecords.every(spec => groupDescriptions[spec.group]));
  for (const spec of additionalRecords) {
    const record = recordCatalog(matches, new Date(), spec.id)[0]?.rows[0];
    if (record) assert.doesNotThrow(() => recordEvidence(matches, spec.id, record), spec.id);
  }
});
test('surface ratios do not count matches on a different surface', () => {
  const matches = Array.from({ length: 20 }, (_, i) => ({ ...fixture(i, i < 10 ? 1 : 2), surface: i < 10 ? 'carpet' as const : 'hard' as const }));
  const piece = recordCatalog(matches, new Date(), 'efectividad-carpet')[0];
  assert.equal(piece.sample, 10);
  assert.equal(piece.rows[0].sample, 10);
  assert.equal(piece.rows[0].value, 100);
  assert.equal(recordEvidence(matches, piece.id, piece.rows[0]).matches.length, 10);
});
test('ace density threshold counts paired service points, not matches', () => {
  const stat = (name: string, value: number): MatchStat => ({ name, value: String(value), player: 1, period: 'match', category: 'Service', won: value, total: null });
  const matches = [0,1].map(i => ({ ...fixture(i), statistics: [stat('Aces', 5), stat('Service points played', 60)] }));
  const piece = recordCatalog(matches, new Date(), 'aces-per-100')[0];
  assert.ok(piece);
  assert.equal(piece.rows[0].sample, 120);
  assert.equal(piece.rows[0].value, 8.3);
  assert.equal(piece.group, 'Saque');
  const unpaired = { ...fixture(2), statistics: [stat('Aces', 1000)] };
  assert.equal(recordEvidence([...matches, unpaired], piece.id, piece.rows[0]).matches.length, 2);
});
test('restated older seasons outrank unchanged recent detail', () => {
  const old = { id: 1, outcome: 'completed', scheduled_time: '2024-01-01', result_version: 1 };
  const recent = { id: 2, outcome: 'completed', scheduled_time: '2026-10-22', result_version: 1 };
  const plan = detailRefreshPlan([{ ...old, result_version: 2 }, recent], new Map([['1',old],['2',recent]]), () => true, {}, Date.parse('2026-10-23'));
  assert.deepEqual(plan.map(row => row.id), [1,2]);
});
