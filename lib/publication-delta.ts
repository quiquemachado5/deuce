import { isDeepStrictEqual } from 'node:util';
import type { Match, Tour } from './types';

export type PublicationDelta = {
  added: number; corrected: number;
  tours: Record<Tour, { added: number; corrected: number }>;
  seasons: string[];
};
/** Count identities, not net row growth. Never silently discard a published match. */
export function comparePublishedMatches(previous: Match[], next: Match[]) {
  const identity = (m: Match) => `${m.tour || 'atp'}:${m.match_id}`;
  const before = new Map(previous.map(m => [identity(m), m]));
  if(before.size!==previous.length)throw new Error('Duplicate previous published identity');
  const seen = new Set<string>();
  const seasons = new Set<string>();
  const delta: PublicationDelta = { added: 0, corrected: 0, tours: { atp: { added: 0, corrected: 0 }, wta: { added: 0, corrected: 0 } }, seasons: [] };
  const changes: { identity: string; before: Match | null; after: Match }[] = [];
  for (const match of next) {
    if (match.tour !== 'atp' && match.tour !== 'wta') throw new Error('Published match requires an explicit circuit');
    const key = identity(match);
    if (seen.has(key)) throw new Error(`Duplicate published identity: ${key}`);
    seen.add(key);
    const old = before.get(key);
    if (old && isDeepStrictEqual({ ...old, tour: old.tour || 'atp' }, match)) continue;
    const kind = old ? 'corrected' : 'added';
    delta[kind]++; delta.tours[match.tour][kind]++;
    seasons.add(`${match.tour}:${match.year}`);
    if(old)seasons.add(`${old.tour||'atp'}:${old.year}`);
    changes.push({ identity: key, before: old || null, after: match });
  }
  for (const key of before.keys()) if (!seen.has(key)) throw new Error(`Publication would remove a verified match: ${key}`);
  delta.seasons = [...seasons].sort();
  return { delta, changes };
}
