import assert from 'node:assert/strict';
import test from 'node:test';
import { WTA_HISTORICAL_ARCHIVE_LEVELS, WTA_HISTORICAL_COHORTS, wtaBackfillCycle, wtaHistoricalCohortPlan, wtaHistoricalLevelsForSeason } from '../lib/wta-backfill-schedule';

const atp = { status: 'success', at: '2026-11-02T04:15:00.000Z' };
const wta = { status: 'success', at: '2026-11-02T06:15:00.000Z' };
const publication = {
  status: 'success', attemptAt: '2026-11-02T08:00:00.000Z', at: '2026-11-02T08:12:00.000Z',
};

test('historical acquisition follows the WTA source tiers used in each era', () => {
  assert.deepEqual(WTA_HISTORICAL_ARCHIVE_LEVELS, ['G', 'W', 'T1', 'T2', 'T3', 'T4', 'T5', 'PM', 'P', 'I', 'F']);
  assert.deepEqual(wtaHistoricalLevelsForSeason(1970), ['G', 'W', 'F']);
  assert.deepEqual(wtaHistoricalLevelsForSeason(2000), ['G', 'W', 'T1', 'T2', 'T3', 'T4', 'T5', 'F']);
  assert.deepEqual(wtaHistoricalLevelsForSeason(2019), ['G', 'PM', 'P', 'I', 'F']);
  assert.equal(WTA_HISTORICAL_COHORTS, 263);
});

test('historical acquisition prioritizes 2019 backwards and skips completed cohorts', () => {
  const plan = wtaHistoricalCohortPlan(new Set(['2019-G', '2019-PM', '2018-G']));
  assert.deepEqual(plan.slice(0, 4), [
    { season: 2019, level: 'P', id: '2019-P' },
    { season: 2019, level: 'I', id: '2019-I' },
    { season: 2019, level: 'F', id: '2019-F' },
    { season: 2018, level: 'PM', id: '2018-PM' },
  ]);
  assert.deepEqual(plan.slice(-5).map(row => row.season), [2020, 2020, 2020, 2020, 2020]);
  assert.equal(plan.length, WTA_HISTORICAL_COHORTS - 3);
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

test('historical WTA resumes the same publication only after the provider reset', () => {
  const previous = {
    status: 'quota-reserve', publicationCycle: publication.attemptAt, backfillDay: '2026-11-02',
    retryAt: '2026-11-03T00:05:00.000Z',
  };
  assert.equal(wtaBackfillCycle(atp, wta, publication, previous,
    Date.parse('2026-11-03T00:04:59.000Z')).status, 'already-attempted');
  assert.deepEqual(wtaBackfillCycle(atp, wta, publication, previous,
    Date.parse('2026-11-03T00:05:00.000Z')), {
    status: 'ready', publicationCycle: publication.attemptAt, backfillDay: '2026-11-02',
    resumedAfter: previous.retryAt,
  });
  assert.equal(wtaBackfillCycle(atp, wta, publication, { ...previous, status: 'free-history-limit' },
    Date.parse('2026-11-03T00:05:00.000Z')).status, 'ready');
});
