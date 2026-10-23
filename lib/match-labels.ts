import type { Match } from './types';
import { tournamentName } from './labels';
import { round } from './cuaderno/model';
import { visibleTournamentCategory } from './tournament-tier';

/** Round is taken from the provider's recorded round code, never inferred from the score. */
export function matchContext(match: Match) {
  return [
    tournamentName(match.tournament),
    String(match.year),
    match.round.trim() ? round(match) : null,
    visibleTournamentCategory(match.category, match.tournament, match.year),
  ].filter(Boolean).join(' · ');
}
