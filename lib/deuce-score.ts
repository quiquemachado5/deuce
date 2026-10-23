import type { MatchRecord } from '@/types/deuce';
export function resolvedWinner(match: MatchRecord): number {
  if (match.winnerIndex !== undefined) return match.winnerIndex;
  if (match.status && match.status.toLowerCase() !== 'finished') return -1;
  if (match.sets.some(set => !resolvedSetClosed(set))) return -1;
  const wins = [0,0];
  for (const set of match.sets) {
    const closed = resolvedSetClosed(set);
    if (closed) wins[set.games[0] > set.games[1] ? 0 : 1]++;
  }
  const target = match.requiredSets || (match.sets.length > 3 ? 3 : 2);
  return wins[0] >= target && wins[1] < target ? 0 : wins[1] >= target && wins[0] < target ? 1 : -1;
}

export function resolvedSetClosed(set: MatchRecord['sets'][number]): boolean {
  const high = Math.max(...set.games), low = Math.min(...set.games);
  return set.completed ?? ((high === 6 && low <= 4) || (high === 7 && low >= 5 && low <= 6) || (high >= 8 && high - low === 2));
}
