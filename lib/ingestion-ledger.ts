import { exactDay } from './archive-freshness';
import { PUBLICATION_CATEGORIES } from './publication-scope';
import type { Match, Tour } from './types';

export const INGESTION_SLA_HOURS = 36;

export type TierLedger = { category: string; matches: number; latestResultDate: string | null };
export type IngestionLedger = {
  generatedAt: string;
  slaHours: number;
  tours: Record<Tour, { matches: number; tiers: TierLedger[] }>;
};

const resultDay = (match: Match) => exactDay(match.context?.date) || exactDay(match.score_summary.timestamp);

/** Durable, circuit-separated coverage facts derived from the published universe. */
export function buildIngestionLedger(matches: readonly Match[], generatedAt: string): IngestionLedger {
  const tours = Object.fromEntries((['atp','wta'] as const).map(tour => {
    const selected = matches.filter(match => (match.tour || 'atp') === tour);
    const tiers = [...PUBLICATION_CATEGORIES[tour]].map(category => {
      const rows = selected.filter(match => match.category === category);
      const dates = rows.map(resultDay).filter((value): value is string => Boolean(value));
      return { category, matches: rows.length, latestResultDate: dates.sort().at(-1) || null };
    });
    return [tour, { matches: selected.length, tiers }];
  })) as IngestionLedger['tours'];
  return { generatedAt, slaHours: INGESTION_SLA_HOURS, tours };
}

export function ingestionSlaStatus(lastSuccessAt: string | undefined, now = Date.now(), slaHours = INGESTION_SLA_HOURS) {
  const successAt = lastSuccessAt && Number.isFinite(Date.parse(lastSuccessAt)) ? Date.parse(lastSuccessAt) : null;
  if (successAt === null) return { state: 'missing' as const, overdueMs: null, dueAt: null, recoveryDue: true };
  const dueAtMs = successAt + slaHours * 3_600_000;
  return {
    state: now > dueAtMs ? 'overdue' as const : 'current' as const,
    overdueMs: Math.max(0, now - dueAtMs),
    dueAt: new Date(dueAtMs).toISOString(),
    recoveryDue: now > dueAtMs,
  };
}
