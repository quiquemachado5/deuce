import { exactDay } from './archive-freshness';
import { PUBLICATION_CATEGORIES } from './publication-scope';
import { providerTournamentName } from './tournament-identity';
import { modernTournamentCategory } from './tournament-tier';
import type { Tour } from './types';

type ProviderResultRow = {
  scheduled_time?: unknown;
  event_date?: unknown;
  outcome?: unknown;
  status?: unknown;
  tour?: unknown;
  draw?: unknown;
  is_doubles?: unknown;
  tier?: unknown;
  tournament?: unknown;
};

const terminalResultStates = new Set(['completed', 'finished', 'retired', 'walkover', 'default']);
const nonResultStates = new Set(['upcoming', 'scheduled', 'live', 'in_progress', 'in progress', 'not_started', 'not started', 'unresolved']);
export const CIRCUIT_FRESHNESS_GRACE_DAYS = 3;

function resultState(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isTerminalProviderResult(row: ProviderResultRow) {
  const states = [resultState(row.outcome), resultState(row.status)].filter(Boolean);
  return !states.some(state => nonResultStates.has(state))
    && states.some(state => terminalResultStates.has(state));
}

function providerDay(value: unknown, now: Date) {
  if (typeof value !== 'string') return null;
  const day = exactDay(value);
  if (!day) return null;
  const timestamp = Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (!Number.isFinite(timestamp) || timestamp > now.getTime()) return null;
  return day;
}

function inCurrentPublicationScope(row: ProviderResultRow, day: string) {
  if (row.draw !== undefined && row.draw !== null && row.draw !== 'singles') return false;
  if (row.is_doubles === true) return false;
  const tour: Tour | null = row.tour === 'atp' || row.tour === 'wta' ? row.tour : null;
  if (!tour || typeof row.tournament !== 'string') return true;
  const tournament = providerTournamentName(row.tournament, { tour, tier: row.tier });
  const category = ['Australian Open', 'Roland Garros', 'Wimbledon', 'US Open'].includes(tournament)
    ? 'Grand Slam'
    : modernTournamentCategory(row.tier, tournament, Number(day.slice(0, 4)), tour);
  return PUBLICATION_CATEGORIES[tour].has(category);
}

/** Latest terminal in-scope result day in a current-results response. Fixtures never advance freshness. */
export function latestProviderResultDate(rows: readonly ProviderResultRow[], now = new Date()) {
  let latest: string | null = null;
  for (const row of rows) {
    if (!row || typeof row !== 'object' || !isTerminalProviderResult(row)) continue;
    const day = providerDay(row.scheduled_time, now) || providerDay(row.event_date, now);
    if (day && inCurrentPublicationScope(row, day) && (!latest || day > latest)) latest = day;
  }
  return latest;
}

function validDay(value: unknown) {
  return typeof value === 'string' ? exactDay(value) : null;
}

export type CircuitFreshnessComparison = {
  latestProviderDate: string | null;
  latestPublishedDate: string | null;
  lagDays: number | null;
  graceDays: number;
  status: 'unknown-provider' | 'missing-publication' | 'current' | 'within-grace' | 'lagging';
  materiallyBehind: boolean;
};

type RefreshStatus = { status: string; ageHours: number | null };

/** Compare sporting dates. Publication timestamps are deliberately irrelevant here. */
export function compareCircuitFreshness(
  latestProviderDate: unknown,
  latestPublishedDate: unknown,
  graceDays = CIRCUIT_FRESHNESS_GRACE_DAYS,
): CircuitFreshnessComparison {
  const provider = validDay(latestProviderDate), published = validDay(latestPublishedDate);
  const grace = Number.isSafeInteger(graceDays) && graceDays >= 0 ? graceDays : CIRCUIT_FRESHNESS_GRACE_DAYS;
  if (!provider) return { latestProviderDate: null, latestPublishedDate: published, lagDays: null, graceDays: grace, status: 'unknown-provider', materiallyBehind: false };
  if (!published) return { latestProviderDate: provider, latestPublishedDate: null, lagDays: null, graceDays: grace, status: 'missing-publication', materiallyBehind: true };
  const lagDays = Math.max(0, Math.round((Date.parse(`${provider}T00:00:00Z`) - Date.parse(`${published}T00:00:00Z`)) / 86_400_000));
  const materiallyBehind = lagDays > grace;
  return {
    latestProviderDate: provider,
    latestPublishedDate: published,
    lagDays,
    graceDays: grace,
    status: materiallyBehind ? 'lagging' : lagDays > 0 ? 'within-grace' : 'current',
    materiallyBehind,
  };
}

/** A successful refresh is a publication gate only when its provider extent is explicit. */
export function assertCircuitPublicationFreshness(tour: Tour, latestProviderDate: unknown, latestPublishedDate: unknown) {
  const comparison = compareCircuitFreshness(latestProviderDate, latestPublishedDate);
  const label = tour.toUpperCase();
  if (!comparison.latestProviderDate) throw new Error(`Successful ${label} refresh has no valid latestProviderDate`);
  if (!comparison.latestPublishedDate) throw new Error(`${label} snapshot has no published result date`);
  if (comparison.materiallyBehind) throw new Error(`${label} snapshot trails provider by ${comparison.lagDays} days (maximum ${comparison.graceDays})`);
  return comparison;
}

/** Only a recent success makes a provider-to-publication claim; stale jobs are diagnosed separately. */
export function recentRefreshFreshnessIssue(refresh: RefreshStatus, comparison: CircuitFreshnessComparison, staleAfterHours = 36) {
  const recentSuccess = refresh.status === 'success' && refresh.ageHours !== null && refresh.ageHours <= staleAfterHours;
  return recentSuccess && (!comparison.latestProviderDate || comparison.materiallyBehind);
}
