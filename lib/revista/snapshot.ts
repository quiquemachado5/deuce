import { createHash } from 'node:crypto';
import { summarizeDataset } from '../dataset-summary';
import type { Match } from '../types';
import { buildSeasonAnalytics, type PlayerRecord } from '../season-analytics';
import { recordCatalog, eraComparisons, type RecordPiece, type RecordRow, type Era } from './records';
export const SNAPSHOT_SCHEMA = 6;
// Bump whenever derivation rules change, even if source matches do not.
export const RULES_VERSION = '2026-10-surfaces-v1';
export const PAGE_SIZE = 25;
export const PIECE_CHUNK_PAGES = 50;
export const pieceChunk = (page:number) => Math.floor((page-1)/PIECE_CHUNK_PAGES);
export type RecordMeta = Omit<RecordPiece, 'rows'> & { total: number; smallTotal: number; leader?: RecordRow; pagePrior?: Record<number, number>; smallPagePrior?: Record<number, number> };
export type RecordManifest = { schema: number; rulesVersion: string; version: string; generatedAt: string; years: number[]; pieces: RecordMeta[]; eraCuts: number[]; matchCount: number; mode: 'DEMO' | 'ARCHIVO REAL'; summary: ReturnType<typeof summarizeDataset> };
export type RecordPages = { pages: Record<string, RecordRow[]>; smallPages: Record<string, RecordRow[]> };
export type Snapshot = { manifest: RecordManifest; pieces: Record<string, RecordPages>; eras: Record<string, Era[]>; matches: Match[]; players: PlayerRecord[] };
export function stripSource(m: Match): Match {
  const safe = {...m}; delete safe.raw_fixture; delete safe.raw_point_tape;
  return safe;
}
export function proofSummary(m: Match): Match { return {...stripSource(m), point_tape: [], statistics: []}; }
const rowSummary = (r: RecordRow): RecordRow => ({...r, proof:r.proof ? proofSummary(r.proof) : undefined});
export function paginate<T>(rows:T[]):Record<string,T[]> {
  const pages:Record<string,T[]> = {};
  for(let i=0;i<rows.length;i+=PAGE_SIZE) pages[String(i/PAGE_SIZE+1)]=rows.slice(i,i+PAGE_SIZE);
  return pages;
}
export function pageBoundaryTies(rows: RecordRow[]): Record<number, number> {
  const ties: Record<number, number> = {};
  for (let start = PAGE_SIZE; start < rows.length; start += PAGE_SIZE) {
    if (rows[start - 1].value === rows[start].value) ties[start / PAGE_SIZE + 1] = rows[start - 1].value;
  }
  return ties;
}
export function compileRecordSnapshot(input: Match[], now = new Date()): Snapshot {
  const matches=input.map(stripSource), catalog=recordCatalog(matches,now), pieces:Snapshot['pieces']={}, metas:RecordMeta[]=[];
  for(const piece of catalog) {
    const rows=piece.rows.map(rowSummary), big=rows.filter(r=>!piece.percent||r.sample>=50), small=piece.percent?rows.filter(r=>r.sample<50):[];
    const {id,group,title,definition,minimum,sample,percent,measured,years}=piece;
    const meta={id,group,title,definition,minimum,sample,percent,measured,years};
    metas.push({...meta,total:big.length,smallTotal:small.length,leader:big[0],pagePrior:pageBoundaryTies(big),smallPagePrior:pageBoundaryTies(small)});
    pieces[piece.id]={pages:paginate(big),smallPages:paginate(small)};
  }
  const eras:Snapshot['eras']={};
  for(const cut of [2010,2020,now.getUTCFullYear()]) {
    const rows=eraComparisons(matches,cut).map(e=>({...e,proof:proofSummary(e.proof)}));
    if(rows.length)eras[String(cut)]=rows;
  }
  const version=createHash('sha256').update(JSON.stringify([SNAPSHOT_SCHEMA,RULES_VERSION,now.toISOString().slice(0,10),matches])).digest('hex').slice(0,20);
  return {manifest:{schema:SNAPSHOT_SCHEMA,rulesVersion:RULES_VERSION,version,generatedAt:now.toISOString(),years:[...new Set(matches.map(m=>m.year))].sort((a,b)=>b-a),pieces:metas,eraCuts:Object.keys(eras).map(Number),matchCount:matches.length,mode:matches.some(m=>m.data_source==='mock')?'DEMO':'ARCHIVO REAL',summary:summarizeDataset(matches)},pieces,eras,matches,players:buildSeasonAnalytics(matches).players};
}
export const clampPage=(value:unknown,total:number)=>Math.min(Math.max(1,Math.floor(Number(value)||1)),Math.max(1,Math.ceil(total/PAGE_SIZE)));
