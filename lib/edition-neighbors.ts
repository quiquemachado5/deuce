import type { Match } from './types';
import { roundPosition } from './editorial';

/** Rounds from the same edition/category only; missing rounds are never invented. */
export function editionNeighbors(matches: Match[], match: Match) {
  const current = roundPosition(match.round);
  return [match.player1.name, match.player2.name].map(name => {
    const path = matches.filter(item => item.match_id !== match.match_id && item.tournament === match.tournament
      && item.year === match.year && item.category === match.category && [item.player1.name,item.player2.name].includes(name))
      .sort((a,b)=>roundPosition(a.round)-roundPosition(b.round));
    return { name, previous: path.filter(item=>roundPosition(item.round)<current).at(-1), next: path.find(item=>roundPosition(item.round)>current) };
  });
}
