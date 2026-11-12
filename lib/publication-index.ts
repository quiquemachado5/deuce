import {publicationSummaryHash} from './publication-hash.mjs';
import type { Match, Tour } from './types';

export const PUBLICATION_INDEX_SCHEMA = 1;

export type PublicationIndexEntry = {
  identity: string;
  tour: Tour;
  year: number;
  hash: string;
};

export type PublicationIndex = {
  schema: typeof PUBLICATION_INDEX_SCHEMA;
  count: number;
  entries: PublicationIndexEntry[];
};

export type PublicationIndexChange = {
  identity: string;
  beforeHash: string | null;
  afterHash: string;
};

const identity = (match: Match) => `${match.tour || 'atp'}:${match.match_id}`;
/** Shared with physical restore verification; large point/stat tapes are tracked separately. */
export function publicationMatchHash(match:Match){return publicationSummaryHash(match)}

export function buildPublicationIndex(matches: readonly Match[]): PublicationIndex {
  const entries: PublicationIndexEntry[] = [], seen = new Set<string>();
  for (const match of matches) {
    if (match.tour !== 'atp' && match.tour !== 'wta') throw new Error('Published match requires an explicit circuit');
    const key = identity(match);
    if (seen.has(key)) throw new Error(`Duplicate published identity: ${key}`);
    seen.add(key);
    entries.push({ identity: key, tour: match.tour, year: match.year, hash: publicationMatchHash(match) });
  }
  entries.sort((a, b) => a.identity.localeCompare(b.identity));
  return { schema: PUBLICATION_INDEX_SCHEMA, count: entries.length, entries };
}

export function validPublicationIndex(value: unknown): value is PublicationIndex {
  if (!value || typeof value !== 'object') return false;
  const index = value as Partial<PublicationIndex>;
  const identities=new Set<string>();
  return index.schema === PUBLICATION_INDEX_SCHEMA && Number.isSafeInteger(index.count)
    && Array.isArray(index.entries) && index.entries.length === index.count
    && index.entries.every(entry => {
      if(!entry||(entry.tour!=='atp'&&entry.tour!=='wta')||typeof entry.identity!=='string'
        ||!entry.identity.startsWith(`${entry.tour}:`)||!/^(?:atp|wta):[^\s/\\?#]+$/.test(entry.identity)
        ||!Number.isSafeInteger(entry.year)||entry.year<1||entry.year>9999
        ||typeof entry.hash!=='string'||!(/^[a-f0-9]{24}$/).test(entry.hash)||identities.has(entry.identity))return false;
      identities.add(entry.identity);return true;
    });
}

/** Count identities, reject deletions and retain hashes as immutable evidence. */
export function comparePublicationIndexes(previous: PublicationIndex, next: PublicationIndex) {
  if (!validPublicationIndex(previous) || !validPublicationIndex(next)) throw new Error('Publication index is invalid');
  const before = new Map(previous.entries.map(entry => [entry.identity, entry]));
  const seen = new Set<string>(), seasons = new Set<string>();
  const delta = { added: 0, corrected: 0, tours: { atp: { added: 0, corrected: 0 }, wta: { added: 0, corrected: 0 } }, seasons: [] as string[] };
  const changes: PublicationIndexChange[] = [];
  for (const entry of next.entries) {
    if (seen.has(entry.identity)) throw new Error(`Duplicate published identity: ${entry.identity}`);
    seen.add(entry.identity);
    const old = before.get(entry.identity);
    if (old?.hash === entry.hash) continue;
    const kind = old ? 'corrected' : 'added';
    delta[kind]++; delta.tours[entry.tour][kind]++;
    seasons.add(`${entry.tour}:${entry.year}`);
    if(old)seasons.add(`${old.tour}:${old.year}`);
    changes.push({ identity: entry.identity, beforeHash: old?.hash || null, afterHash: entry.hash });
  }
  for (const key of before.keys()) if (!seen.has(key)) throw new Error(`Publication would remove a verified match: ${key}`);
  delta.seasons = [...seasons].sort();
  return { delta, changes };
}
