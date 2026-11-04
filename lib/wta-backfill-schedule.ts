type StatusRow = Record<string, unknown> | undefined;

/** Raw WTA source tiers retained before the stricter public-scope filter. */
export const WTA_HISTORICAL_ARCHIVE_LEVELS = ['G', 'W', 'T1', 'T2', 'T3', 'T4', 'T5', 'PM', 'P', 'I', 'F'] as const;
export const WTA_HISTORICAL_FIRST_YEAR = 1968;
export const WTA_HISTORICAL_LAST_YEAR = 2022;
export const WTA_HISTORICAL_PRIORITY_THROUGH_YEAR = 2019;

export type WtaHistoricalArchiveLevel = typeof WTA_HISTORICAL_ARCHIVE_LEVELS[number];

export function wtaHistoricalLevelsForSeason(season: number): readonly WtaHistoricalArchiveLevel[] {
  if (season >= 2009) return ['G', 'PM', 'P', 'I', 'F'];
  if (season >= 1995) return ['G', 'W', 'T1', 'T2', 'T3', 'T4', 'T5', 'F'];
  return ['G', 'W', 'F'];
}

export function wtaHistoricalCohortIds() {
  return Array.from(
    { length: WTA_HISTORICAL_LAST_YEAR - WTA_HISTORICAL_FIRST_YEAR + 1 },
    (_, index) => WTA_HISTORICAL_FIRST_YEAR + index,
  ).flatMap(season => wtaHistoricalLevelsForSeason(season).map(level => `${season}-${level}`));
}

export const WTA_HISTORICAL_COHORTS = wtaHistoricalCohortIds().length;

export function wtaHistoryProgress(archiveIndex: unknown, seasonState: unknown, now = Date.now()) {
  const index = archiveIndex && typeof archiveIndex === 'object' ? archiveIndex as Record<string, unknown> : {};
  const seasons = seasonState && typeof seasonState === 'object' ? seasonState as Record<string, unknown> : {};
  const expected = wtaHistoricalCohortIds();
  const completedCohorts = new Set(Array.isArray(index.complete)
    ? index.complete.filter((id): id is string => typeof id === 'string')
    : []);
  const completedSeasons = new Set(Array.isArray(seasons.completed)
    ? seasons.completed.filter((year): year is number => Number.isSafeInteger(year))
    : []);
  const currentYear = new Date(now).getUTCFullYear();
  const pendingModernSeasons = Array.from(
    { length: Math.max(0, currentYear - 2023) },
    (_, index) => 2023 + index,
  ).filter(year => !completedSeasons.has(year));
  const historicalCohorts = expected.filter(id => completedCohorts.has(id)).length;
  return {
    historicalCohorts,
    totalHistoricalCohorts: expected.length,
    pendingModern: pendingModernSeasons.length,
    pendingModernSeasons,
    finished: historicalCohorts === expected.length && pendingModernSeasons.length === 0,
  };
}

/**
 * Finish the requested historical era first, then fill the remaining recent
 * cohorts. Provider levels stay broad here; publication applies the strict
 * Grand Slam/WTA 1000/WTA 500/WTA 250 contract afterwards.
 */
export function wtaHistoricalCohortPlan(
  completed: ReadonlySet<string>,
  priorityThroughYear = WTA_HISTORICAL_PRIORITY_THROUGH_YEAR,
  levels?: readonly WtaHistoricalArchiveLevel[],
) {
  const through = Math.max(WTA_HISTORICAL_FIRST_YEAR, Math.min(WTA_HISTORICAL_LAST_YEAR, priorityThroughYear));
  const years = [
    ...Array.from({ length: through - WTA_HISTORICAL_FIRST_YEAR + 1 }, (_, index) => through - index),
    ...Array.from({ length: WTA_HISTORICAL_LAST_YEAR - through }, (_, index) => WTA_HISTORICAL_LAST_YEAR - index),
  ];
  return years.flatMap(season => (levels || wtaHistoricalLevelsForSeason(season))
    .map(level => ({ season, level, id: `${season}-${level}` })))
    .filter(cohort => !completed.has(cohort.id));
}

const validDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
  ? value
  : undefined;

const successfulAt = (row: StatusRow) => row?.status === 'success'
  ? validDate(row.at) || validDate(row.lastSuccessAt)
  : undefined;

/**
 * Historical work gets one attempt per published UTC day. The publication
 * must be newer than both current-circuit refreshes, so history can never
 * spend a newly reset quota before ATP and WTA have refreshed.
 */
export function wtaBackfillCycle(
  atpRefresh: StatusRow,
  wtaRefresh: StatusRow,
  publication: StatusRow,
  previousBackfill: StatusRow,
  now = Date.now(),
) {
  const atpAt = successfulAt(atpRefresh);
  const wtaAt = successfulAt(wtaRefresh);
  const publishedAt = successfulAt(publication);
  const publicationCycle = validDate(publication?.attemptAt)
    || validDate(publication?.publicationAt)
    || publishedAt;
  if (!atpAt || !wtaAt || !publishedAt || !publicationCycle) {
    return { status: 'waiting-current-publication' as const, reason: 'current-refresh-incomplete' as const };
  }
  const publishedTime = Date.parse(publishedAt);
  if (publishedTime < Math.max(Date.parse(atpAt), Date.parse(wtaAt))) {
    return { status: 'waiting-current-publication' as const, reason: 'publication-precedes-refresh' as const };
  }
  if (publishedTime > now + 5 * 60_000 || now - publishedTime > 18 * 3_600_000) {
    return { status: 'waiting-current-publication' as const, reason: 'publication-not-current' as const };
  }
  const backfillDay = publishedAt.slice(0, 10);
  const retryAt = validDate(previousBackfill?.retryAt);
  const providerResetReached = ['quota-reserve', 'free-history-limit'].includes(String(previousBackfill?.status))
    && retryAt !== undefined
    && Date.parse(retryAt) <= now;
  if ((previousBackfill?.publicationCycle === publicationCycle || previousBackfill?.backfillDay === backfillDay)
    && !providerResetReached) {
    return { status: 'already-attempted' as const, publicationCycle, backfillDay };
  }
  return { status: 'ready' as const, publicationCycle, backfillDay, ...(providerResetReached ? { resumedAfter: retryAt } : {}) };
}
