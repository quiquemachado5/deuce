import assert from 'node:assert/strict';
import test from 'node:test';
import { WTA_HISTORICAL_ARCHIVE_LEVELS, WTA_HISTORICAL_COHORTS, wtaBackfillCycle } from '../lib/wta-backfill-schedule';

const atp = { status: 'success', at: '2026-11-02T04:15:00.000Z' };
const wta = { status: 'success', at: '2026-11-02T06:15:00.000Z' };
const publication = {
  status: 'success', attemptAt: '2026-11-02T08:00:00.000Z', at: '2026-11-02T08:12:00.000Z',
};

test('historical acquisition retains every broad provider cohort before publication filtering', () => {
  assert.deepEqual(WTA_HISTORICAL_ARCHIVE_LEVELS, ['G', 'M', 'A']);
  assert.equal(WTA_HISTORICAL_COHORTS, 165);
});

test('historical WTA runs once after both current refreshes and publication', () => {
  assert.deepEqual(
    wtaBackfillCycle(atp, wta, publication, undefined, Date.parse('2026-11-02T09:00:00.000Z')),
    { status: 'ready', publicationCycle: publication.attemptAt, backfillDay: '2026-11-02' },
  );
  assert.equal(wtaBackfillCycle(atp, wta, publication, {
    status: 'quota-reserve', publicationCycle: publication.attemptAt, backfillDay: '2026-11-02',
  }, Date.parse('2026-11-03T00:05:00.000Z')).status, 'already-attempted');
  assert.equal(wtaBackfillCycle(atp, wta, publication, {
    status: 'free-history-limit', publicationCycle: publication.attemptAt, backfillDay: '2026-11-02',
  }, Date.parse('2026-11-02T10:00:00.000Z')).status, 'already-attempted');
});

test('historical WTA waits when current refresh has not been published', () => {
  assert.equal(wtaBackfillCycle(
    { status: 'success', at: '2026-11-02T08:30:00.000Z' }, wta, publication, undefined,
    Date.parse('2026-11-02T09:00:00.000Z'),
  ).status, 'waiting-current-publication');
  assert.equal(wtaBackfillCycle(atp, { status: 'quota-reserve', lastSuccessAt: wta.at }, publication, undefined,
    Date.parse('2026-11-02T09:00:00.000Z')).status, 'waiting-current-publication');
});
