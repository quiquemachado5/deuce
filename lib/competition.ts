import type { Match } from "./types";
import { prepareMatch, canonicalName } from "./quality";
export const isCompetitionOnly = (match: Match) =>
  match.winner !== null &&
  /^(retired|abandoned|walkover|cancelled)$/i.test(match.status);
/** Preserve a documented winner after orientation, without admitting the result to rankings. */
export function prepareCompetitionMatch(match: Match): Match {
  const name = match.winner === 1 ? match.player1.name : match.player2.name,
    prepared = prepareMatch(match);
  return {
    ...prepared,
    winner: canonicalName(name) === prepared.player1.name ? 1 : 2,
    point_tape: [],
    statistics: [],
  };
}
