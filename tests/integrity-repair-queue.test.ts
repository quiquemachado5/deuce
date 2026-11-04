import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIntegrityRepairQueue, type RepairLedger } from '../lib/integrity-repair-queue';
import type { CoverageIssue, CoverageReconciliation } from '../lib/coverage-reconciliation';

const issue = (overrides: Partial<CoverageIssue> = {}): CoverageIssue => ({
  id: 'confirmed:atp:US Open:1987:Grand Slam', tour: 'atp', kind: 'draw', state: 'confirmed',
  reason: 'missing-late-rounds', title: 'Abierto de Estados Unidos · 1987', detail: 'Falta una semifinal.',
  count: 1, year: 1987, tournament: 'US Open', category: 'Grand Slam', ...overrides,
});
const report = (issues: CoverageIssue[]): CoverageReconciliation => ({
  summary: { editions: 1, confirmed: 1, verification: 0, conflicts: 0, rankingGroups: 0, queuedCohorts: 0, pendingRows: 0 },
  issues,
});
const empty: RepairLedger = { schema: 1, entries: [] };

test('repair queue prioritizes documented draw gaps and keeps ATP/WTA separate', () => {
  const queue = buildIntegrityRepairQueue(report([
    issue(),
    issue({ id: 'confirmed:wta:Small:1990:WTA 250', tour: 'wta', tournament: 'Small', category: 'WTA 250', reason: 'unresolved-results' }),
    issue({ id: 'review:wta:Unknown:1970:WTA 250', tour: 'wta', state: 'review', tournament: 'Unknown', reason: 'uncertified-draw-size' }),
  ]), empty, '2026-11-04T12:00:00.000Z');
  assert.equal(queue.entries.length, 2);
  assert.equal(queue.entries[0].tour, 'atp');
  assert.equal(queue.entries[0].priority, 'P0');
  assert.equal(queue.summary.atp, 1);
  assert.equal(queue.summary.wta, 1);
  assert.equal(queue.entries.every(row => row.evidenceRequired), true);
});

test('a resolved repair requires secure, attributable evidence', () => {
  const base = { id: issue().id, tour: 'atp' as const, state: 'resolved' as const, updatedAt: '2026-11-04T12:00:00.000Z' };
  assert.throws(() => buildIntegrityRepairQueue(report([issue()]), { schema: 1, entries: [base] }), /requires a documented source/);
  assert.throws(() => buildIntegrityRepairQueue(report([issue()]), { schema: 1, entries: [{ ...base, evidence: [{ url: 'http://example.test', publisher: 'Example', sourceType: 'independent', scope: 'draw', checkedAt: '2026-11-04' }] }] }), /invalid or insecure/);
  assert.throws(() => buildIntegrityRepairQueue(report([issue()]), { schema: 1, entries: [{ ...base, evidence: [{ url: 'https://example.test', publisher: 'Example', sourceType: 'blog' as 'official', scope: 'draw', checkedAt: '2026-11-04' }] }] }), /invalid or insecure/);
  assert.throws(() => buildIntegrityRepairQueue(report([issue()]), { schema: 1, entries: [{ ...base, evidence: [{ url: 'https://example.test', publisher: 'Example', sourceType: 'independent', scope: 'guess' as 'draw', checkedAt: '2026-02-30' }] }] }), /invalid or insecure/);
  const queue = buildIntegrityRepairQueue(report([issue()]), { schema: 1, entries: [{ ...base, evidence: [{ url: 'https://www.usopen.org/example', publisher: 'US Open', sourceType: 'official', scope: 'draw', checkedAt: '2026-11-04' }] }] });
  assert.equal(queue.summary.resolvedAwaitingPublication, 1);
});

test('ledger decisions cannot cross circuits or silently lose an investigation', () => {
  const decision = { id: issue().id, tour: 'wta' as const, state: 'investigating' as const, updatedAt: '2026-11-04T12:00:00.000Z' };
  assert.throws(() => buildIntegrityRepairQueue(report([issue()]), { schema: 1, entries: [decision] }), /crosses ATP\/WTA/);
  assert.throws(() => buildIntegrityRepairQueue(report([]), { schema: 1, entries: [{ ...decision, tour: 'atp' }] }), /absent from the current audit/);
});
