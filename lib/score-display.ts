import type { Match } from "./types";
import { closedSet } from "./quality";
import { historicalClosedSet } from "./historical-rules";
export const displaySetClosed = (match: Match, index: number) =>
  closedSet(match.score_summary.games[index]) ||
  historicalClosedSet(match, index);
export const displaySetsWon = (match: Match, side: number) =>
  match.score_summary.games.filter(
    (set, index) => displaySetClosed(match, index) && set[side] > set[1 - side],
  ).length;

/** A walkover has no played score; never render a fabricated 0–0. */
export const displayTotal = (match: Match, side: number): number | string =>
  !match.score_summary.games.length && /walkover|cancelled/i.test(match.status)
    ? match.winner === side + 1
      ? "W/O"
      : "—"
    : displaySetsWon(match, side);
