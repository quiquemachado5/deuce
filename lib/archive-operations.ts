import { WTA_HISTORICAL_ARCHIVE_LEVELS, WTA_HISTORICAL_FIRST_YEAR, WTA_HISTORICAL_LAST_YEAR } from './wta-backfill-schedule';

export function operationStatus(value: unknown) {
  const row = value && typeof value === 'object' ? value as Record<string,unknown> : {};
  const date = (v:unknown) => typeof v==='string'&&Number.isFinite(Date.parse(v))?v:undefined;
  return {
    status: typeof row.status==='string'?row.status:'unavailable',
    attemptAt: date(row.attemptAt)||date(row.at),
    successAt: date(row.lastSuccessAt)||(row.status==='success'?date(row.at):undefined),
    publicationAt: date(row.publicationAt),
    reason: typeof row.message==='string'?row.message:undefined,
    found: typeof row.matches==='number'?row.matches:typeof row.seasonMatches==='number'?row.seasonMatches:undefined,
    seasons: Array.isArray(row.seasonsRefreshed)?row.seasonsRefreshed.filter((v):v is number=>typeof v==='number'):[],
  };
}

type OperationRecord = Record<string, unknown>;

const dated = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const terminal = (row: OperationRecord) => typeof row.status === 'string' && !['running', 'busy', 'unavailable'].includes(row.status);
const withoutHistory = (row: OperationRecord) => {
  const { history: _history, ...entry } = row;
  void _history;
  return entry;
};
const operationIdentity = (row: OperationRecord) => `${String(row.attemptAt || row.at || '')}:${String(row.status || '')}`;

/**
 * Status objects are intentionally small, so retaining the last 45 completed
 * attempts beside the current status gives Coverage a durable daily audit
 * without adding another database or one object per API request.
 */
export function operationHistory(value: unknown): OperationRecord[] {
  if (!value || typeof value !== 'object') return [];
  const current = value as OperationRecord;
  const saved = Array.isArray(current.history)
    ? current.history.filter((row): row is OperationRecord => !!row && typeof row === 'object')
    : [];
  const candidates = [...saved, withoutHistory(current)].filter(row => terminal(row) && (dated(row.attemptAt) || dated(row.at)));
  const unique = new Map<string, OperationRecord>();
  for (const row of candidates) unique.set(operationIdentity(row), withoutHistory(row));
  return [...unique.values()].sort((a, b) => Date.parse(String(a.attemptAt || a.at)) - Date.parse(String(b.attemptAt || b.at)));
}

export function withOperationHistory(previous: unknown, next: OperationRecord, limit = 45): OperationRecord {
  const history = [...operationHistory(previous), ...operationHistory(next)];
  const unique = new Map<string, OperationRecord>();
  for (const row of history) unique.set(operationIdentity(row), row);
  return { ...withoutHistory(next), history: [...unique.values()].slice(-Math.max(1, limit)) };
}

export function wtaBackfillProgress(value: unknown) {
  if (!value || typeof value!=='object' || !Array.isArray((value as {complete?:unknown}).complete)) return undefined;
  const complete = new Set((value as {complete:unknown[]}).complete);
  const expected = Array.from({length:WTA_HISTORICAL_LAST_YEAR-WTA_HISTORICAL_FIRST_YEAR+1},(_,i)=>WTA_HISTORICAL_FIRST_YEAR+i)
    .flatMap(year=>WTA_HISTORICAL_ARCHIVE_LEVELS.map(level=>`${year}-${level}`));
  return { total:expected.length, completed:expected.filter(id=>complete.has(id)).length, pending:expected.filter(id=>!complete.has(id)) };
}
