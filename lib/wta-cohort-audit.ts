import { wtaHistoricalCohortIds } from './wta-backfill-schedule';

type CohortRow = { id?: unknown; tour?: unknown; event_date?: unknown; level?: unknown };
type CohortPayload = { data?: unknown; complete?: unknown; total?: unknown; at?: unknown };

export type WtaCohortCoverage = {
  total: number;
  completed: number;
  pending: string[];
  rows: number;
  rowsByCohort: Record<string, number>;
  latestAt?: string;
  eras: Array<{ from: number; to: number; total: number; completed: number }>;
};

export type WtaCohortBaseline = {
  minimumCompletedCohorts: number;
  minimumRows: number;
  minimumRowsByCohort: Record<string, number>;
  minimumCompletedByEra: Record<string, number>;
  allowedPendingCohorts: string[];
};

const validDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

/** Validate every saved provider cohort before it can be treated as durable progress. */
export function auditWtaCohorts(payloads: ReadonlyMap<string, unknown>): WtaCohortCoverage {
  const expected = wtaHistoricalCohortIds();
  const expectedSet = new Set(expected);
  const completed = new Set<string>();
  const seen = new Map<string, string>();
  const dates: string[] = [];
  const rowsByCohort: Record<string, number> = {};
  let rows = 0;

  for (const [id, value] of payloads) {
    if (!expectedSet.has(id)) continue;
    if (!value || typeof value !== 'object') throw new Error(`WTA cohort ${id} is not an object`);
    const payload = value as CohortPayload;
    const year = id.slice(0, 4);
    const level = id.slice(5);
    if (payload.complete !== true || !Array.isArray(payload.data)) throw new Error(`WTA cohort ${id} is incomplete`);
    if (payload.total !== undefined && !Number.isSafeInteger(payload.total)) {
      throw new Error(`WTA cohort ${id} has an invalid total`);
    }
    if (Number.isSafeInteger(payload.total) && payload.total !== payload.data.length) {
      throw new Error(`WTA cohort ${id} has ${payload.data.length}/${payload.total} rows`);
    }
    const local = new Set<string>();
    for (const [index, value] of payload.data.entries()) {
      if (!value || typeof value !== 'object') throw new Error(`WTA cohort ${id} has an invalid row at ${index}`);
      const row = value as CohortRow;
      if (row.id === undefined || row.id === null || String(row.id).length === 0) throw new Error(`WTA cohort ${id} has a row without id`);
      if (row.tour !== 'wta') throw new Error(`WTA cohort ${id} contains another circuit`);
      if (typeof row.event_date !== 'string' || !validDate(row.event_date) || !row.event_date.startsWith(`${year}-`)) {
        throw new Error(`WTA cohort ${id} contains another season`);
      }
      if (row.level !== level) throw new Error(`WTA cohort ${id} contains another level`);
      const matchId = String(row.id);
      if (local.has(matchId)) throw new Error(`WTA cohort ${id} repeats match ${matchId}`);
      const prior = seen.get(matchId);
      if (prior) throw new Error(`WTA match ${matchId} appears in ${prior} and ${id}`);
      local.add(matchId);
      seen.set(matchId, id);
    }
    if (payload.at !== undefined && !validDate(payload.at)) throw new Error(`WTA cohort ${id} has an invalid timestamp`);
    if (validDate(payload.at)) dates.push(payload.at);
    rows += payload.data.length;
    rowsByCohort[id] = payload.data.length;
    completed.add(id);
  }

  const eras = [[1968, 1994], [1995, 2008], [2009, 2022]].map(([from, to]) => {
    const ids = expected.filter(id => { const year = Number(id.slice(0, 4)); return year >= from && year <= to; });
    return { from, to, total: ids.length, completed: ids.filter(id => completed.has(id)).length };
  });
  return {
    total: expected.length,
    completed: completed.size,
    pending: expected.filter(id => !completed.has(id)),
    rows,
    rowsByCohort,
    ...(dates.length ? { latestAt: dates.sort((left, right) => Date.parse(left) - Date.parse(right)).at(-1) } : {}),
    eras,
  };
}

/** A partial migration may advance, but committed coverage must never regress. */
export function assertWtaCohortBaseline(coverage: WtaCohortCoverage, baseline: WtaCohortBaseline) {
  if (!Number.isSafeInteger(baseline.minimumCompletedCohorts) || !Number.isSafeInteger(baseline.minimumRows)) {
    throw new Error('WTA history baseline is invalid');
  }
  if (!Array.isArray(baseline.allowedPendingCohorts)
    || new Set(baseline.allowedPendingCohorts).size !== baseline.allowedPendingCohorts.length
    || baseline.allowedPendingCohorts.some(id => !wtaHistoricalCohortIds().includes(id))) {
    throw new Error('WTA history pending allowlist is invalid');
  }
  const allowedPending = new Set(baseline.allowedPendingCohorts);
  const unexpectedPending = coverage.pending.filter(id => !allowedPending.has(id));
  if (unexpectedPending.length) {
    throw new Error(`WTA history regressed; missing cohorts outside the allowlist: ${unexpectedPending.join(', ')}`);
  }
  const expected = wtaHistoricalCohortIds();
  const committed = expected.filter(id => !allowedPending.has(id));
  const minimumRowsByCohort = baseline.minimumRowsByCohort;
  if (!minimumRowsByCohort || typeof minimumRowsByCohort !== 'object' || Array.isArray(minimumRowsByCohort)
    || Object.keys(minimumRowsByCohort).length !== committed.length
    || committed.some(id => !Object.hasOwn(minimumRowsByCohort, id))
    || Object.entries(minimumRowsByCohort).some(([id, minimum]) => !expected.includes(id)
      || !Number.isSafeInteger(minimum) || minimum < 0)) {
    throw new Error('WTA history cohort row baseline is invalid');
  }
  if (coverage.completed < baseline.minimumCompletedCohorts) {
    throw new Error(`WTA history regressed to ${coverage.completed}/${baseline.minimumCompletedCohorts} committed cohorts`);
  }
  if (coverage.rows < baseline.minimumRows) {
    throw new Error(`WTA history regressed to ${coverage.rows}/${baseline.minimumRows} committed rows`);
  }
  for (const [id, minimum] of Object.entries(minimumRowsByCohort)) {
    const actual = coverage.rowsByCohort[id];
    if (!Number.isSafeInteger(actual) || actual < minimum) {
      throw new Error(`WTA history cohort ${id} regressed to ${actual ?? 0}/${minimum} rows`);
    }
  }
  for (const [key, minimum] of Object.entries(baseline.minimumCompletedByEra)) {
    const [from, to] = key.split('-').map(Number);
    const era = coverage.eras.find(candidate => candidate.from === from && candidate.to === to);
    if (!era || !Number.isSafeInteger(minimum) || era.completed < minimum) {
      throw new Error(`WTA history regressed in era ${key}: ${era?.completed ?? 0}/${minimum}`);
    }
  }
  return coverage;
}
