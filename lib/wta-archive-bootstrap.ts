import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import {
  WTA_HISTORICAL_ARCHIVE_LEVELS,
  WTA_HISTORICAL_FIRST_YEAR,
  WTA_HISTORICAL_LAST_YEAR,
} from './wta-backfill-schedule';

type ArchiveRow = Record<string, unknown>;
type ArchivePayload = Record<string, unknown> & {
  data: ArchiveRow[];
  complete?: boolean;
  at?: string;
};
type ArchiveReader = (key: string) => Promise<unknown>;
type ArchiveWriter = (key: string, payload: unknown) => Promise<void>;

const cohortFile = /^archive-(\d{4})-([GMA])\.json\.gz$/;
const modernFile = /^modern-(\d{4})\.json\.gz$/;
const allowedLevels = new Set<string>(WTA_HISTORICAL_ARCHIVE_LEVELS);

function archivePayload(value: unknown, id: string, requireComplete: boolean): ArchivePayload | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const payload = value as Record<string, unknown>;
  if (!Array.isArray(payload.data) || (requireComplete && payload.complete !== true)) return undefined;
  const rows = payload.data.map((value, index) => {
    if (!value || typeof value !== 'object' || (value as ArchiveRow).id === undefined || (value as ArchiveRow).id === null) {
      throw new Error(`Bundled WTA archive ${id} has an invalid row at ${index}`);
    }
    const row = value as ArchiveRow;
    if (row.tour && row.tour !== 'wta') throw new Error(`Bundled WTA archive ${id} contains another circuit`);
    return { ...row, tour: 'wta' };
  });
  return {
    ...payload,
    data: rows,
    complete: payload.complete === true ? true : payload.complete === false ? false : undefined,
  } as ArchivePayload;
}

function expectedCohort(id: string) {
  const match = /^(\d{4})-([GMA])$/.exec(id);
  if (!match) return false;
  const year = Number(match[1]);
  return year >= WTA_HISTORICAL_FIRST_YEAR
    && year <= WTA_HISTORICAL_LAST_YEAR
    && allowedLevels.has(match[2]);
}

async function readBundledPayload(root: string, file: string, id: string) {
  let decoded: unknown;
  try {
    decoded = JSON.parse(gunzipSync(await readFile(join(root, file))).toString());
  } catch (error) {
    throw new Error(`Cannot read bundled WTA archive ${id}`, { cause: error });
  }
  const payload = archivePayload(decoded, id, true);
  if (!payload) throw new Error(`Bundled WTA archive ${id} is incomplete`);
  return payload;
}

export type BundledWtaArchiveBootstrap = {
  bundledModernSeasons: number[];
  completedModernSeasons: number[];
  materializedModernSeasons: number;
  adoptedModernSeasons: number;
  retainedModernSeasons: number;
  materializedModernRows: number;
  seasonStateUpdated: boolean;
  bundledCohorts: number;
  completedCohorts: number;
  materializedCohorts: number;
  adoptedCohorts: number;
  retainedCohorts: number;
  materializedRows: number;
  indexUpdated: boolean;
};

/**
 * Persist complete WTA seasons and historical cohorts shipped with the release
 * before a backfill can spend provider quota. Data objects are written before
 * their progress pointers, so state never advertises data that was not durably
 * materialized. The active UTC season remains open for daily refreshes.
 */
export async function materializeBundledWtaArchive(
  read: ArchiveReader,
  write: ArchiveWriter,
  root = join(process.cwd(), 'data', 'archive', 'wta'),
  now = new Date().toISOString(),
): Promise<BundledWtaArchiveBootstrap> {
  const directory = await readdir(root).catch(error => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  });
  const files = directory
    .map(file => ({ file, match: cohortFile.exec(file) }))
    .filter((entry): entry is { file: string; match: RegExpExecArray } => !!entry.match)
    .map(entry => ({ file: entry.file, id: `${entry.match[1]}-${entry.match[2]}` }))
    .filter(entry => expectedCohort(entry.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const currentYear = new Date(now).getUTCFullYear();
  if (!Number.isInteger(currentYear)) throw new Error('Cannot determine the WTA bootstrap UTC year');
  const modernFiles = directory
    .map(file => ({ file, match: modernFile.exec(file) }))
    .filter((entry): entry is { file: string; match: RegExpExecArray } => !!entry.match)
    .map(entry => ({ file: entry.file, year: Number(entry.match[1]) }))
    .filter(entry => entry.year >= 2023 && entry.year <= currentYear)
    .sort((a, b) => a.year - b.year);

  const [savedSeasonState, savedIndex] = await Promise.all([
    read('wta-season-state'),
    read('wta-archive-index'),
  ]);
  const savedCompletedSeasons = savedSeasonState && typeof savedSeasonState === 'object'
    && Array.isArray((savedSeasonState as { completed?: unknown }).completed)
    ? (savedSeasonState as { completed: unknown[] }).completed
      .filter((year): year is number => Number.isInteger(year) && Number(year) >= 2023 && Number(year) < currentYear)
    : [];
  const completedSeasons = new Set(savedCompletedSeasons);
  const savedComplete = savedIndex && typeof savedIndex === 'object' && Array.isArray((savedIndex as { complete?: unknown }).complete)
    ? (savedIndex as { complete: unknown[] }).complete.filter((id): id is string => typeof id === 'string')
    : [];
  const complete = new Set(savedComplete);
  let materializedCohorts = 0;
  let adoptedCohorts = 0;
  let retainedCohorts = 0;
  let materializedRows = 0;
  let materializedModernSeasons = 0;
  let adoptedModernSeasons = 0;
  let retainedModernSeasons = 0;
  let materializedModernRows = 0;

  for (const { file, year } of modernFiles) {
    const id = String(year);
    const bundled = await readBundledPayload(root, file, id);
    const key = `season-wta-${year}`;
    const existing = archivePayload(await read(key), id, false);
    const existingIds = new Set((existing?.data || []).map(row => String(row.id)));
    const existingScope = typeof existing?.scope === 'string' && ['wta-main-v1', 'wta-main-v2'].includes(existing.scope)
      ? existing.scope
      : undefined;
    const includesBundledBaseline = !!existing && existing.complete !== false && !!existingScope
      && bundled.data.every(row => existingIds.has(String(row.id)));
    if (includesBundledBaseline) {
      if (year < currentYear && !completedSeasons.has(year)) adoptedModernSeasons++;
      else retainedModernSeasons++;
    } else {
      const rows = new Map<string, ArchiveRow>();
      for (const row of bundled.data) rows.set(String(row.id), row);
      for (const row of existing?.data || []) rows.set(String(row.id), row);
      const data = [...rows.values()];
      await write(key, {
        ...bundled,
        ...(existing || {}),
        data,
        scope: existingScope || bundled.scope,
        complete: true,
        at: now,
      });
      materializedModernSeasons++;
      materializedModernRows += data.length;
    }
    if (year < currentYear) completedSeasons.add(year);
  }

  for (const { file, id } of files) {
    if (complete.has(id)) {
      retainedCohorts++;
      continue;
    }
    const key = `archive-wta-${id}`;
    const existingValue = await read(key);
    const existing = archivePayload(existingValue, id, false);
    if (existing?.complete) {
      complete.add(id);
      adoptedCohorts++;
      continue;
    }

    const bundled = await readBundledPayload(root, file, id);
    const rows = new Map<string, ArchiveRow>();
    for (const row of bundled.data) rows.set(String(row.id), row);
    for (const row of existing?.data || []) rows.set(String(row.id), row);
    const data = [...rows.values()];
    await write(key, {
      ...bundled,
      ...(existing || {}),
      data,
      complete: true,
      nextOffset: 0,
      total: data.length,
      at: now,
    });
    complete.add(id);
    materializedCohorts++;
    materializedRows += data.length;
  }

  const completeValues = [...complete].sort();
  const completedSeasonValues = [...completedSeasons].sort((a, b) => a - b);
  const normalizedSavedSeasons = [...new Set(savedCompletedSeasons)].sort((a, b) => a - b);
  const rawCompletedSeasons = savedSeasonState && typeof savedSeasonState === 'object'
    && Array.isArray((savedSeasonState as { completed?: unknown }).completed)
    ? (savedSeasonState as { completed: unknown[] }).completed
    : [];
  const seasonStateUpdated = completedSeasonValues.length !== normalizedSavedSeasons.length
    || completedSeasonValues.some((year, index) => year !== normalizedSavedSeasons[index])
    || rawCompletedSeasons.length !== normalizedSavedSeasons.length
    || rawCompletedSeasons.some(year => typeof year !== 'number' || year >= currentYear);
  const indexUpdated = completeValues.length !== savedComplete.length
    || completeValues.some((id, index) => id !== [...savedComplete].sort()[index]);
  if (seasonStateUpdated) {
    const prior = savedSeasonState && typeof savedSeasonState === 'object' ? savedSeasonState as Record<string, unknown> : {};
    await write('wta-season-state', { ...prior, completed: completedSeasonValues, at: now });
  }
  if (indexUpdated) {
    const prior = savedIndex && typeof savedIndex === 'object' ? savedIndex as Record<string, unknown> : {};
    await write('wta-archive-index', { ...prior, complete: completeValues, at: now });
  }

  return {
    bundledModernSeasons: modernFiles.map(entry => entry.year),
    completedModernSeasons: completedSeasonValues,
    materializedModernSeasons,
    adoptedModernSeasons,
    retainedModernSeasons,
    materializedModernRows,
    seasonStateUpdated,
    bundledCohorts: files.length,
    completedCohorts: completeValues.filter(expectedCohort).length,
    materializedCohorts,
    adoptedCohorts,
    retainedCohorts,
    materializedRows,
    indexUpdated,
  };
}
