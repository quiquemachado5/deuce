import { chronological } from './editorial';
import { playerIdentity } from './explore';
import { eligibleMatch } from './quality';
import type { Match, Tour } from './types';

/** Same continuity rules as the published record, retaining its actual evidence. */
export function longestPlayerWinningRun(matches: readonly Match[], name: string, tour: Tour): Match[] {
  const identity = playerIdentity(name, tour);
  const seen = new Set<string>();
  let current: Match[] = [], best: Match[] = [];
  for (const match of [...matches].sort(chronological)) {
    if ((match.tour || 'atp') !== tour || seen.has(match.match_id)) continue;
    const side = playerIdentity(match.player1.name, tour) === identity ? 1
      : playerIdentity(match.player2.name, tour) === identity ? 2 : null;
    if (!side) continue;
    seen.add(match.match_id);
    if (eligibleMatch(match) && match.winner === side) {
      current.push(match);
      if (current.length > best.length) best = current.slice();
    } else current = [];
  }
  return best;
}
