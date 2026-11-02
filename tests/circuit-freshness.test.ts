import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCircuitPublicationFreshness,
  compareCircuitFreshness,
  latestProviderResultDate,
  recentRefreshFreshnessIssue,
} from '../lib/circuit-freshness';

test('provider freshness uses terminal current results and rejects fixtures, invalid dates and future rows', () => {
  const now = new Date('2026-11-05T12:00:00Z');
  const rows = [
    { outcome: 'completed', scheduled_time: '2026-10-31T15:00:00Z' },
    { outcome: 'retired', scheduled_time: '2026-11-01T15:00:00Z' },
    { outcome: 'completed', status: 'upcoming', scheduled_time: '2026-11-05T08:00:00Z' },
    { status: 'live', scheduled_time: '2026-11-05T09:00:00Z' },
    { status: 'upcoming', scheduled_time: '2026-11-05T10:00:00Z' },
    { outcome: 'unresolved', scheduled_time: '2026-11-05T11:00:00Z' },
    { outcome: 'completed', scheduled_time: '2026-02-30T10:00:00Z' },
    { outcome: 'completed', scheduled_time: '2026-11-06T10:00:00Z' },
    { outcome: 'completed', tour: 'wta', draw: 'doubles', tier: 'wta_250', tournament: 'Hong Kong', scheduled_time: '2026-11-04T10:00:00Z' },
    { outcome: 'completed', tour: 'wta', draw: 'singles', tier: 'wta_125', tournament: 'Madrid', scheduled_time: '2026-11-04T09:00:00Z' },
    { outcome: 'completed', tour: 'wta', draw: 'singles', tier: null, tournament: 'Hong Kong', scheduled_time: '2026-11-03T10:00:00Z' },
    { outcome: 'walkover', event_date: '2026-11-02' },
  ];
  assert.equal(latestProviderResultDate(rows, now), '2026-11-03');
  assert.equal(latestProviderResultDate([{ status: 'upcoming', scheduled_time: '2026-11-02T08:00:00Z' }], now), null);
});

test('provider-to-snapshot lag allows three sporting days and ignores wall-clock offseason age', () => {
  assert.deepEqual(compareCircuitFreshness('2026-10-06', '2026-10-03'), {
    latestProviderDate: '2026-10-06', latestPublishedDate: '2026-10-03', lagDays: 3,
    graceDays: 3, status: 'within-grace', materiallyBehind: false,
  });
  assert.equal(compareCircuitFreshness('2026-10-06', '2026-10-02').materiallyBehind, true);
  assert.equal(compareCircuitFreshness('2026-01-10', '2026-01-10').status, 'current');
  assert.equal(compareCircuitFreshness('not-a-date', '2026-01-10').status, 'unknown-provider');
  assert.equal(compareCircuitFreshness('2026-01-10', undefined).status, 'missing-publication');
});

test('publication rejects successful refreshes without an extent or materially stale circuit data', () => {
  assert.throws(() => assertCircuitPublicationFreshness('atp', null, '2026-10-06'), /no valid latestProviderDate/);
  assert.throws(() => assertCircuitPublicationFreshness('wta', '2026-11-02', null), /no published result date/);
  assert.throws(() => assertCircuitPublicationFreshness('atp', '2026-10-06', '2026-10-02'), /trails provider by 4 days/);
  assert.equal(assertCircuitPublicationFreshness('wta', '2026-11-02', '2026-10-31').status, 'within-grace');
});

test('health degrades only a recent successful claim with missing or lagging provider extent', () => {
  const lagging = compareCircuitFreshness('2026-11-02', '2026-10-29');
  const missing = compareCircuitFreshness(undefined, '2026-11-02');
  assert.equal(recentRefreshFreshnessIssue({ status: 'success', ageHours: 2 }, lagging), true);
  assert.equal(recentRefreshFreshnessIssue({ status: 'success', ageHours: 2 }, missing), true);
  assert.equal(recentRefreshFreshnessIssue({ status: 'success', ageHours: 40 }, lagging), false);
  assert.equal(recentRefreshFreshnessIssue({ status: 'error', ageHours: 2 }, lagging), false);
});
