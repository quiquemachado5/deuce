import type { Match } from './types';

/** One index per immutable generation. No request-specific data is shared. */
const indexes = new WeakMap<Match[], ReturnType<typeof createIndex>>();
function createIndex(matches: Match[]) {
  const players = new Map<string, Match[]>(), years = new Map<number, Match[]>(), ids = new Map<string, Match>();
  for (const match of matches) {
    ids.set(match.match_id, match);
    for (const name of [match.player1.name, match.player2.name]) {
      const rows = players.get(name) || []; rows.push(match); players.set(name, rows);
    }
    const rows = years.get(match.year) || []; rows.push(match); years.set(match.year, rows);
  }
  return { players, years, ids };
}
export function archiveIndex(matches: Match[]) {
  let index = indexes.get(matches);
  if (!index) { index = createIndex(matches); indexes.set(matches, index); }
  return index;
}
export type ArchiveFilter = { year?: string; surface?: string; competition?: string; era?: string };
export function filterArchive(matches: Match[], q: ArchiveFilter) {
  const source = q.year && q.year !== 'all' ? archiveIndex(matches).years.get(Number(q.year)) || [] : matches;
  const lastTwentyFrom = new Date().getUTCFullYear() - 19;
  return source.filter(m => (!q.era || q.era === 'all' || q.era !== 'last20' || m.year >= lastTwentyFrom)
    && (!q.surface || q.surface === 'all' || m.surface === q.surface)
    && (!q.competition || q.competition === 'all' || m.category === q.competition));
}
