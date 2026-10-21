import type { Match } from './types';
/** Scope: men's singles main draw. Sources and deliberately unknown eras in docs/OPERATIONS.md. */
export function isRecordedTiebreak(match: Match, setIndex: number) {
  const pair = match.score_summary.games[setIndex];
  if (!pair) return false;
  const high = Math.max(...pair), low = Math.min(...pair);
  if (high === 7 && low === 6) return true;
  return match.tournament === 'Wimbledon' && match.year >= 2019 && match.year <= 2021 && setIndex === 4 && high === 13 && low === 12;
}
export function tiebreakTarget(match: Match | undefined, set: number): number | null {
  if (set !== 5) return 7;
  if (!match || match.category !== 'Grand Slam') return null;
  if (match.year >= 2022 || match.tournament === 'Australian Open' && match.year >= 2019) return 10;
  if (match.tournament === 'Wimbledon' && match.year >= 2019 && match.year <= 2021) return 7;
  // The US Open first used a different nine-point sudden-death format. Do not infer its target.
  if (match.tournament === 'US Open' && match.year >= 1975) return 7;
  return null;
}
export function historicalClosedSet(match: Match, index: number) {
  const pair = match.score_summary.games[index];
  return pair?.length === 2 && pair.every(Number.isInteger) && isRecordedTiebreak(match,index);
}
