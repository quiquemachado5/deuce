import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { WTA_HISTORICAL_ARCHIVE_LEVELS, WTA_HISTORICAL_COHORTS, wtaBackfillCycle, wtaHistoricalCohortPlan, wtaHistoricalLevelsForSeason } from '../lib/wta-backfill-schedule';
import { assertWtaCohortBaseline, auditWtaCohorts, type WtaCohortBaseline } from '../lib/wta-cohort-audit';

const atp = { status: 'success', at: '2026-11-02T04:15:00.000Z' };
const wta = { status: 'success', at: '2026-11-02T06:15:00.000Z' };
const publication = {
  status: 'success', attemptAt: '2026-11-02T08:00:00.000Z', at: '2026-11-02T08:12:00.000Z',
};
const committedBaseline = JSON.parse(readFileSync(new URL('../ops/wta-history-baseline.json', import.meta.url), 'utf8')) as WtaCohortBaseline;

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

test('historical WTA baseline explicitly allows only W and F from 1968 through 1983',()=>{
  const expected=Array.from({length:16},(_,index)=>1968+index).flatMap(year=>[`${year}-W`,`${year}-F`]);
  assert.deepEqual(committedBaseline.allowedPendingCohorts,expected);
  assert.equal(new Set(committedBaseline.allowedPendingCohorts).size,32);
  assert.equal(Object.keys(committedBaseline.minimumRowsByCohort).length,committedBaseline.minimumCompletedCohorts);
  assert.equal(Object.values(committedBaseline.minimumRowsByCohort).reduce((sum,rows)=>sum+rows,0),committedBaseline.minimumRows);
});

test('historical WTA coverage rejects partial, contaminated and duplicate cohorts',()=>{
  const row=(id:number,year:number,level='G')=>({id,tour:'wta',event_date:`${year}-01-01`,level});
  const valid=(rows:Array<ReturnType<typeof row>>,total=rows.length)=>({complete:true,total,at:'2026-11-03T00:00:00Z',data:rows});
  const coverage=auditWtaCohorts(new Map([
    ['1968-G',valid([row(1,1968)])],
    ['1969-G',valid([row(2,1969)])],
  ]));
  assert.equal(coverage.total,WTA_HISTORICAL_COHORTS);
  assert.equal(coverage.completed,2);
  assert.equal(coverage.rows,2);
  assert.deepEqual(coverage.rowsByCohort,{'1968-G':1,'1969-G':1});
  assert.ok(coverage.pending.includes('1968-W'));
  assert.throws(()=>auditWtaCohorts(new Map([['1968-G',{complete:false,data:[]}]])),/incomplete/);
  assert.throws(()=>auditWtaCohorts(new Map([['1968-G',valid([{...row(1,1968),tour:'atp'}])]])),/another circuit/);
  assert.throws(()=>auditWtaCohorts(new Map([
    ['1968-G',valid([row(1,1968)])],
    ['1968-W',valid([row(1,1968,'W')])],
  ])),/appears in/);
  assert.throws(()=>auditWtaCohorts(new Map([['1968-G',valid([row(1,1968)],2)]])),/1\/2 rows/);
  assert.throws(()=>auditWtaCohorts(new Map([['1968-G',{...valid([row(1,1968)]),total:'1'}]])),/invalid total/);
  assert.throws(()=>auditWtaCohorts(new Map([['1968-G',valid([row(1,1969)])]])),/another season/);
  assert.throws(()=>auditWtaCohorts(new Map([['1968-G',valid([row(1,1968,'W')])]])),/another level/);
  const baseline=(overrides:Partial<WtaCohortBaseline>={}):WtaCohortBaseline=>({
    minimumCompletedCohorts:2,
    minimumRows:2,
    minimumRowsByCohort:{...coverage.rowsByCohort},
    minimumCompletedByEra:{'1968-1994':2},
    allowedPendingCohorts:coverage.pending,
    ...overrides,
  });
  assert.throws(()=>assertWtaCohortBaseline(coverage,baseline({
    minimumCompletedCohorts:3,
  })),/committed cohorts/);
  assert.throws(()=>assertWtaCohortBaseline(coverage,baseline({
    minimumRows:3,
  })),/committed rows/);
  assert.equal(assertWtaCohortBaseline(coverage,baseline()),coverage);
  assert.throws(()=>assertWtaCohortBaseline({
    ...coverage,
    rowsByCohort:{'1968-G':0,'1969-G':2},
  },baseline()),/cohort 1968-G regressed to 0\/1 rows/);
  assert.throws(()=>assertWtaCohortBaseline(coverage,baseline({
    allowedPendingCohorts:coverage.pending.filter(id=>id!=='1968-W'),
  })),/outside the allowlist.*1968-W/);
  assert.doesNotThrow(()=>assertWtaCohortBaseline({
    ...coverage,pending:coverage.pending.filter(id=>id!=='1968-W'),completed:3,
  },baseline()));
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
