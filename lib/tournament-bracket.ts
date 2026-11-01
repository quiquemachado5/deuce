import { toMatchRecord } from '@/data/map-match';
import { roundLabel, roundPosition, winnerName } from './editorial';
import type { Match } from './types';
import type { MatchRecord } from '@/types/deuce';

export type TournamentBracketMatch = {
  champion?: string;
  match: MatchRecord;
};
export type TournamentBracketRound = {
  position: number;
  label: string;
  results: TournamentBracketMatch[];
};

/** Keep detailed archive rows on the server side of the interactive bracket. */
export function tournamentBracketRounds(matches: Match[]): TournamentBracketRound[] {
  const final = matches.find((match) => roundPosition(match.round) === 7 && match.winner);
  const champion = final ? winnerName(final) : null;
  const rounds = new Map<number, TournamentBracketRound>();
  for (const match of matches) {
    const position = roundPosition(match.round);
    if (!position) continue;
    const round = rounds.get(position) || { position, label: roundLabel(match.round), results: [] };
    const pathChampion = champion !== null && winnerName(match) === champion ? champion : undefined;
    round.results.push({ ...(pathChampion ? { champion: pathChampion } : {}), match: toMatchRecord(match) });
    rounds.set(position, round);
  }
  return [...rounds.values()].sort((a, b) => a.position - b.position);
}
