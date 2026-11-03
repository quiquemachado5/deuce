import type { WtaHistoricalArchiveLevel } from './wta-backfill-schedule';
import { isDeepStrictEqual } from 'node:util';

type WtaArchiveRow = Record<string, unknown> & { id?: unknown; level?: unknown; tour?: unknown; event_date?: unknown };
type BroadArchive = Record<string, unknown> & { data?: unknown; complete?: unknown; at?: unknown };

export type DerivedWtaCohort = {
  data: WtaArchiveRow[];
  complete: true;
  at: string;
  nextOffset: 0;
  total: number;
  scope: string;
};

export const WTA_BROAD_DERIVABLE_LEVELS = ['PM', 'P', 'I', 'F'] as const satisfies readonly WtaHistoricalArchiveLevel[];

function archiveRows(value: unknown, year: number): { rows: WtaArchiveRow[]; at: string } {
  if (!value || typeof value !== 'object') throw new Error(`WTA broad archive ${year}-A is not an object`);
  const payload = value as BroadArchive;
  if (payload.complete !== true || !Array.isArray(payload.data)) throw new Error(`WTA broad archive ${year}-A is incomplete`);
  if (typeof payload.at !== 'string' || !Number.isFinite(Date.parse(payload.at))) throw new Error(`WTA broad archive ${year}-A has an invalid timestamp`);
  const ids = new Set<string>();
  const rows = payload.data.map((value, index) => {
    if (!value || typeof value !== 'object') throw new Error(`WTA broad archive ${year}-A has an invalid row at ${index}`);
    const row = value as WtaArchiveRow;
    if (row.id === undefined || row.id === null || String(row.id).length === 0) throw new Error(`WTA broad archive ${year}-A has a row without id`);
    if (row.tour !== 'wta') throw new Error(`WTA broad archive ${year}-A contains another circuit`);
    if (typeof row.level !== 'string') throw new Error(`WTA broad archive ${year}-A has a row without level`);
    if (typeof row.event_date !== 'string' || !Number.isFinite(Date.parse(row.event_date)) || !row.event_date.startsWith(`${year}-`)) {
      throw new Error(`WTA broad archive ${year}-A contains another season`);
    }
    const id = String(row.id);
    if (ids.has(id)) throw new Error(`WTA broad archive ${year}-A repeats match ${id}`);
    ids.add(id);
    return row;
  });
  return { rows, at: payload.at };
}

/** Derive provider-native level cohorts from a complete broad A response without changing any row. */
export function deriveWtaCohortsFromBroadArchive(value: unknown, year: number) {
  if (!Number.isSafeInteger(year) || year < 2009 || year > 2022) throw new Error(`Unsupported WTA broad archive season: ${year}`);
  const { rows, at } = archiveRows(value, year);
  return Object.fromEntries(WTA_BROAD_DERIVABLE_LEVELS.map(level => {
    const data = rows.filter(row => row.level === level);
    return [`${year}-${level}`, {
      data,
      complete: true,
      at,
      nextOffset: 0,
      total: data.length,
      scope: `derived-from-${year}-A`,
    } satisfies DerivedWtaCohort];
  })) as Record<string, DerivedWtaCohort>;
}

export function sameWtaCohortRows(value: unknown, expected: DerivedWtaCohort) {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<DerivedWtaCohort>;
  if (payload.complete !== true || payload.total !== expected.total || !Array.isArray(payload.data)) return false;
  if (payload.data.length !== expected.data.length) return false;
  return payload.data.every((row, index) => isDeepStrictEqual(row, expected.data[index]));
}
