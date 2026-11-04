import { createHash } from 'node:crypto';
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
const stableValue=(value:unknown):unknown=>{
  if(Array.isArray(value))return value.map(stableValue);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value as Record<string,unknown>)
    .filter(([,entry])=>entry!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([key,entry])=>[key,stableValue(entry)]));
  return value;
};

/**
 * The publication ledger intentionally hashes the public match summary, not
 * the large point/stat arrays. Their coverage is tracked separately in the
 * manifest, while this projection detects result and metadata corrections
 * without inflating the previous full generation in memory.
 */
export function publicationMatchHash(match: Match) {
  const { raw_fixture: _fixture, raw_point_tape: _tape, point_tape, statistics, listingCapabilities: storedCapabilities, editorial_highlight:_derivedHighlight, context, ...summary } = match;
  void _fixture; void _tape; void _derivedHighlight;
  const listingCapabilities = {
    statistics: storedCapabilities?.statistics ?? statistics.length > 0,
    points: storedCapabilities?.points ?? point_tape.length > 0,
  };
  return createHash('sha256').update(JSON.stringify(stableValue({
    ...summary,
    tour: match.tour || 'atp',
    ...(context&&Object.keys(context).length?{context}:{}),
    listingCapabilities,
  }))).digest('hex').slice(0, 24);
}

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
  return index.schema === PUBLICATION_INDEX_SCHEMA && Number.isSafeInteger(index.count)
    && Array.isArray(index.entries) && index.entries.length === index.count
    && index.entries.every(entry => entry && (entry.tour === 'atp' || entry.tour === 'wta')
      && typeof entry.identity === 'string' && entry.identity.startsWith(`${entry.tour}:`)
      && Number.isSafeInteger(entry.year) && typeof entry.hash === 'string' && /^[a-f0-9]{24}$/.test(entry.hash));
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
    changes.push({ identity: entry.identity, beforeHash: old?.hash || null, afterHash: entry.hash });
  }
  for (const key of before.keys()) if (!seen.has(key)) throw new Error(`Publication would remove a verified match: ${key}`);
  delta.seasons = [...seasons].sort();
  return { delta, changes };
}
