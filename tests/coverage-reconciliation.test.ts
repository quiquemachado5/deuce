import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileCoverage } from '../lib/coverage-reconciliation';
import type { EditionAudit } from '../lib/edition-audit';
import type { Match } from '../lib/types';

const match = (overrides: Partial<Match> = {}): Match => ({
  match_id: 'atp-1', tour: 'atp', tournament: 'Rome', surface: 'clay', category: 'Masters 1000', year: 2024,
  player1: { name: 'Uno', seed: null }, player2: { name: 'Dos', seed: null },
  score_summary: { sets: [2, 0], games: [[6, 4], [6, 4]], points: [], server: null, is_tiebreak: false, win_probability_p1: null, timestamp: '2024-05-10T00:00:00Z' },
  final_score: '6-4 6-4', round: 'Final', winner: 1, status: 'completed', point_tape: [], statistics: [], data_source: 'api',
  ...overrides,
});
const audit = (overrides: Partial<EditionAudit> = {}): EditionAudit => ({
  tournament: 'Rome', tour: 'atp', year: 2024, category: 'Masters 1000', sourceRows: 31,
  completed: 31, terminal: 0, pending: 0, hasFinal: true, rounds: {}, expectedLateRounds: true,
  missingLateRounds: [], completeDraw: null, ...overrides,
});

test('reconciliation separates proven incidents from unknown completeness', () => {
  const result = reconcileCoverage([match()], [
    audit({ completeDraw: false, missingLateRounds: ['1 semifinal'] }),
    audit({ tournament: 'Madrid', completeDraw: null }),
  ], ['1983-W']);
  assert.equal(result.summary.confirmed, 1);
  assert.equal(result.summary.verification, 1);
  assert.equal(result.summary.queuedCohorts, 1);
  assert.equal(result.issues.find(issue => issue.tournament === 'Madrid')?.state, 'review');
  assert.equal(result.issues.find(issue => issue.kind === 'history')?.tour, 'wta');
});

test('candidate conflicts never blend ATP and WTA identities', () => {
  const atp = match();
  const wta = match({ match_id: 'wta-1', tour: 'wta' });
  const result = reconcileCoverage([atp, wta], [], []);
  assert.equal(result.summary.conflicts, 0);
});
