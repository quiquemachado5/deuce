import type { Match } from './types';
/** Scope: men's singles main draw. Sources and deliberately unknown eras in docs/OPERATIONS.md. */
export function isRecordedTiebreak(match: Match, setIndex: number) {
  const pair = match.score_summary.games[setIndex];
  if (!pair) return false;
  const high = Math.max(...pair), low = Math.min(...pair);
  // Tokyo 1970 used a nine-point tiebreak at five-all, ending the set 6–5.
  // https://www.atptour.com/en/news/stan-smith-remembers-1970-masters-in-tokyo
  if(match.category==='ATP Finals'&&match.year===1970&&high===6&&low===5)return true;
  if (high === 7 && low === 6) return true;
  // Wimbledon used the eight-all tiebreak in 1971–1978, except in the deciding set.
  // Official archive: https://assets.wimbledon.com/archive/draws/pdfs/draws/1978_MS_A4.pdf
  if (match.tournament === 'Wimbledon' && match.year >= 1971 && match.year <= 1978 && setIndex < (match.tour === 'wta' ? 2 : 4) && high === 9 && low === 8) return true;
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
