import { circuitSectionHref } from './circuit-navigation';
import type { Tour } from './types';

type CircuitMatch = { match_id: string; tour?: Tour };

export function matchCircuit(match: Pick<CircuitMatch, 'tour'>): Tour {
  return match.tour || 'atp';
}

export function comparisonSearchUrl(query: string, tour: Tour) {
  return `/api/search?${new URLSearchParams({ tour, q: query })}`;
}

export function findCircuitMatch<T extends CircuitMatch>(
  matches: readonly T[],
  id: string | undefined,
  tour: Tour,
): T | null {
  if (!id) return null;
  return matches.find((match) => match.match_id === id && matchCircuit(match) === tour) || null;
}

export function comparisonArchiveHref(tour: Tour) {
  return circuitSectionHref('matches', tour);
}

export function comparisonPageHref(matchId: string, tour: Tour) {
  return `/compare?${new URLSearchParams({ left: matchId, tour })}`;
}
