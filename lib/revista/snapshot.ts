import { createHash } from 'node:crypto';
import { summarizeDataset } from '../dataset-summary';
import type {EditionAudit} from '../edition-audit';
import type { Match } from '../types';
import { buildSeasonAnalytics, type PlayerRecord } from '../season-analytics';
import { recordCatalog, eraComparisons, type RecordPiece, type RecordRow, type Era } from './records';
export const SNAPSHOT_SCHEMA = 7;
// Bump whenever derivation rules change, even if source matches do not.
export const RULES_VERSION = '2026-10-complete-editions-v6';
export const PAGE_SIZE = 25;
export const PIECE_CHUNK_PAGES = 50;
export const pieceChunk = (page:number) => Math.floor((page-1)/PIECE_CHUNK_PAGES);
export type RecordMeta = Omit<RecordPiece, 'rows'> & { total: number; smallTotal: number; leader?: RecordRow; pagePrior?: Record<number, number>; smallPagePrior?: Record<number, number> };
export type RecordManifest = { schema: number; rulesVersion: string; version: string; generatedAt: string; years: number[]; pieces: RecordMeta[]; eraCuts: number[]; matchCount: number; competitionCount?:number; editionCount?:number; mode: 'DEMO' | 'ARCHIVO REAL'; summary: ReturnType<typeof summarizeDataset> };
export type RecordPages = { pages: Record<string, RecordRow[]>; smallPages: Record<string, RecordRow[]> };
export type Snapshot = { manifest: RecordManifest; pieces: Record<string, RecordPages>; eras: Record<string, Era[]>; matches: Match[]; players: PlayerRecord[]; competition:Match[]; audit:EditionAudit[] };
export function stripSource(m: Match): Match {
  const {raw_fixture: _fixture,raw_point_tape: _tape,...safe}=m;
  void _fixture;void _tape;
  return safe;
}
export function proofSummary(m: Match): Match { return {...stripSource(m), point_tape: [], statistics: []}; }
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
export function compileRecordSnapshot(input: Match[], now = new Date(), competitionInput:Match[]=[],audit:EditionAudit[]=[]): Snapshot {
  const competition=competitionInput.map(proofSummary);
  const matches=input.map(stripSource), catalog=recordCatalog(matches,now), pieces:Snapshot['pieces']={}, metas:RecordMeta[]=[];
  // A match can substantiate many rankings. Share its compact proof instead of
  // retaining hundreds of thousands of duplicate property dictionaries.
  const proofs=new WeakMap<Match,Match>();
  const rowSummary=(r:RecordRow):RecordRow=>{
    if(!r.proof)return {...r,proof:undefined};
    let proof=proofs.get(r.proof);
    if(!proof){proof=proofSummary(r.proof);proofs.set(r.proof,proof);}
    return {...r,proof};
  };
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
  // Identical JSON bytes, bounded allocation: no giant temporary match string.
  const hash=createHash('sha256').update(JSON.stringify([SNAPSHOT_SCHEMA,RULES_VERSION,now.toISOString().slice(0,10)]).slice(0,-1)+',[');
  matches.forEach((match,i)=>{if(i)hash.update(',');hash.update(JSON.stringify(match));});
  const version=hash.update('],').update(JSON.stringify(competition)).update(',').update(JSON.stringify(audit)).update(']').digest('hex').slice(0,20);
  return {manifest:{schema:SNAPSHOT_SCHEMA,rulesVersion:RULES_VERSION,version,generatedAt:now.toISOString(),years:[...new Set(matches.map(m=>m.year))].sort((a,b)=>b-a),pieces:metas,eraCuts:Object.keys(eras).map(Number),matchCount:matches.length,competitionCount:competition.length,editionCount:audit.length,mode:matches.some(m=>m.data_source==='mock')?'DEMO':'ARCHIVO REAL',summary:summarizeDataset(matches)},pieces,eras,matches,competition,audit,players:buildSeasonAnalytics(matches).players};
}
export const clampPage=(value:unknown,total:number)=>Math.min(Math.max(1,Math.floor(Number(value)||1)),Math.max(1,Math.ceil(total/PAGE_SIZE)));
