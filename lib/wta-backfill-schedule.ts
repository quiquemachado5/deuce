type StatusRow = Record<string, unknown> | undefined;

/** Raw provider cohorts retained before the stricter public-scope filter. */
export const WTA_HISTORICAL_ARCHIVE_LEVELS = ['G', 'M', 'A'] as const;
export const WTA_HISTORICAL_FIRST_YEAR = 1968;
export const WTA_HISTORICAL_LAST_YEAR = 2022;
export const WTA_HISTORICAL_COHORTS = (WTA_HISTORICAL_LAST_YEAR - WTA_HISTORICAL_FIRST_YEAR + 1)
  * WTA_HISTORICAL_ARCHIVE_LEVELS.length;

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
  if (previousBackfill?.publicationCycle === publicationCycle || previousBackfill?.backfillDay === backfillDay) {
    return { status: 'already-attempted' as const, publicationCycle, backfillDay };
  }
  return { status: 'ready' as const, publicationCycle, backfillDay };
}
