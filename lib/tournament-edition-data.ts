import type { Match, Tour } from './types';

/** Replace only the active edition with full rows; keep history for navigation. */
export function mergeTournamentEditionDetails(
  summaries: readonly Match[],
  details: readonly Match[],
  competition: readonly Match[],
  year: number,
  tour: Tour | 'all' = 'all',
) {
  const selected=new Map(details
    .filter(match=>match.year===year&&(tour==='all'||(match.tour||'atp')===tour))
    .map(match=>[match.match_id,match]));
  return [...summaries.map(match=>selected.get(match.match_id)||match),...competition];
}
