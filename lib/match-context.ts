import type { Match } from './types';

/** Relationship context stays inside one circuit and keeps full target detail. */
export function circuitMatchContext(summaries: readonly Match[], match: Match) {
  const tour=match.tour||'atp';
  return summaries
    .filter(candidate=>(candidate.tour||'atp')===tour)
    .map(candidate=>candidate.match_id===match.match_id?match:candidate);
}
