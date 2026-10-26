type ResultRow = {
  id?: unknown;
  outcome?: unknown;
  winner?: unknown;
  format?: unknown;
  tournament?: unknown;
  players?: { p1?: { name?: unknown }; p2?: { name?: unknown } };
  score?: { games?: unknown };
  [key: string]: unknown;
};

function gamesOf(row: ResultRow): number[][] {
  const games = row.score?.games;
  if (!Array.isArray(games) || games.length !== 2 || !games.every(Array.isArray)) return [];
  if (games[0].length !== games[1].length) return [];
  const number = (value: unknown) => value === null || value === undefined || value === '' ? NaN : Number(value);
  return games[0].map((game: unknown, index: number) => [number(game), number(games[1][index])]);
}

function closedSet([a, b]: number[]): boolean {
  if (![a, b].every((game) => Number.isInteger(game) && game >= 0)) return false;
  const high = Math.max(a, b), low = Math.min(a, b);
  return (high === 6 && low <= 4) || (high === 7 && (low === 5 || low === 6)) || (high >= 8 && high - low === 2);
}

/** A list result may be marked complete before its final score is restated. */
export function hasClosedModernResult(row: ResultRow): boolean {
  if (row.outcome !== 'completed' || (row.winner !== 1 && row.winner !== 2)) return false;
  const games = gamesOf(row);
  const bestOf = row.format === 'BO5' || /australian open|french open|roland garros|wimbledon|us open/i.test(String(row.tournament || '')) ? 5 : 3;
  const target = bestOf === 5 ? 3 : 2;
  if (!games.length || games.length > bestOf) return false;
  const sets = [0, 0];
  for (const game of games) {
    if (sets.some((won) => won >= target) || !closedSet(game)) return false;
    sets[game[0] > game[1] ? 0 : 1]++;
  }
  return sets[row.winner - 1] === target && sets[2 - row.winner] < target;
}

function samePlayerOrder(a: ResultRow, b: ResultRow): boolean {
  const normalize = (name: unknown) => String(name || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return ([1, 2] as const).every((side) => {
    const key = `p${side}` as const;
    const first = normalize(a.players?.[key]?.name), second = normalize(b.players?.[key]?.name);
    return first !== '' && first === second;
  });
}

/** Keep the season list primary; accept a saved detail only to repair an invalid completed result. */
export function recoveredModernResult<T extends ResultRow>(list: T, detail?: { match?: ResultRow }): T {
  const candidate = detail?.match;
  if (hasClosedModernResult(list) || list.outcome !== 'completed' || !candidate ||
      String(candidate.id) !== String(list.id) || !samePlayerOrder(list, candidate) ||
      !hasClosedModernResult(candidate)) return list;
  return { ...list, winner: candidate.winner, score: candidate.score, format: candidate.format || list.format };
}
