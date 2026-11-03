import 'server-only';
import { asyncCache } from '../async-cache';
import { filterArchive, type ArchiveFilter } from '../archive-index';
import { recordCatalog } from './records';
import type { PreparedGeneration } from './generation';
import type { Match } from '../types';
import type { RecordPiece } from './records';
const selections = asyncCache<Match[]>(300_000, 8);
const catalogs = asyncCache<RecordPiece[]>(300_000, 24);
export async function selectedArchive(g: PreparedGeneration, q: ArchiveFilter, load:()=>Promise<Match[]>=g.matches) {
  const summary=load!==g.matches;
  const key = JSON.stringify([g.manifest.version,g.source,summary?'summary':'detail',q.year || 'all',q.surface || 'all',q.competition || 'all',q.era || 'all',q.tour || 'all']);
  return selections(key,async () => filterArchive(await load(),{...q,tour:q.tour==='wta'?'wta':'atp'}));
}
export async function selectedCatalog(g: PreparedGeneration, q: ArchiveFilter, id?:string, load:()=>Promise<Match[]>=g.matches) {
  const summary=load!==g.matches;
  const key = JSON.stringify([g.manifest.version,g.source,summary?'summary':'detail',q.year || 'all',q.surface || 'all',q.competition || 'all',q.era || 'all',q.tour || 'all',id]);
  return catalogs(key,async () => recordCatalog(await selectedArchive(g,q,load),new Date(g.manifest.generatedAt),id));
}
