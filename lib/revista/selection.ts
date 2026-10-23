import 'server-only';
import { asyncCache } from '../async-cache';
import { filterArchive, type ArchiveFilter } from '../archive-index';
import { recordCatalog } from './records';
import type { PreparedGeneration } from './generation';
import type { Match } from '../types';
import type { RecordPiece } from './records';
const selections = asyncCache<Match[]>(300_000, 8);
const catalogs = asyncCache<RecordPiece[]>(300_000, 24);
export async function selectedArchive(g: PreparedGeneration, q: ArchiveFilter) {
  const key = JSON.stringify([g.manifest.version,g.source,q.year || 'all',q.surface || 'all',q.competition || 'all',q.era || 'all']);
  return selections(key,async () => filterArchive(await g.matches(),q));
}
export async function selectedCatalog(g: PreparedGeneration, q: ArchiveFilter, id?:string) {
  const key = JSON.stringify([g.manifest.version,g.source,q.year || 'all',q.surface || 'all',q.competition || 'all',q.era || 'all',id]);
  return catalogs(key,async () => recordCatalog(await selectedArchive(g,q),new Date(g.manifest.generatedAt),id));
}
