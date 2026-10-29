import 'server-only';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {cache} from 'react';
import {cloudClient} from '../cloud-archive';
import {asyncCache} from '../async-cache';
import type {Match} from '../types';
import type {PlayerRecord} from '../season-analytics';
import {eraComparisons,type Era,type RecordRow} from './records';
import {clampPage,pageBoundaryTies,pieceChunk,PAGE_SIZE,SNAPSHOT_SCHEMA,RULES_VERSION,type RecordManifest,type RecordMeta,type RecordPages} from './snapshot';
import {selectGeneration,type PreparedGeneration,type GenerationStatus} from './generation';
import {selectedArchive, selectedCatalog} from './selection';
import {archiveIndex} from '../archive-index';
import {auditEditions} from '../edition-audit';
const bundled=asyncCache<unknown>(3600_000,100);
async function local<T>(id:string):Promise<T>{return await bundled(id,async()=>JSON.parse(gunzipSync(await readFile(join(process.cwd(),'data','reading',`${id}.json.gz`))).toString())) as T;}
async function localOptional<T>(id:string,fallback:T):Promise<T>{try{return await local<T>(id);}catch{return fallback;}}
const remote=asyncCache<any>(300_000,32);
async function query(key:string,projection='payload',budget=800):Promise<any>{
 try{return await remote(`${key}:${projection}`,async()=>{
  const db=cloudClient();if(!db)return null;
  const {data,error}=await db.from('deuce_archive_objects').select(projection).eq('key',key).abortSignal(AbortSignal.timeout(budget)).maybeSingle();
  if(error)throw error;
  return data;
 });}catch{return undefined;}
}
const generations=asyncCache<PreparedGeneration>(300_000,1,g=>g.fallbackReason?30_000:300_000);
export const preparedGeneration=cache(()=>generations('active',async()=>{
 const base=await local<RecordManifest>('manifest');
 if(base.schema!==SNAPSHOT_SCHEMA||base.rulesVersion!==RULES_VERSION)throw new Error('Reading snapshot is incompatible; run npm run build');
 const fresh=await query('reading-v2-manifest','payload',5000);
 return selectGeneration({manifest:base,source:'bundled',matches:()=>local<Match[]>('matches'),records:()=>local<PlayerRecord[]>('players'),competition:()=>localOptional<Match[]>('competition',[])},fresh===null?null:fresh?.payload,
   async m=>{const [matches,records,competition]=await Promise.all([cloudBlob<Match[]>(m.version,'matches'),cloudBlob<PlayerRecord[]>(m.version,'players'),cloudBlob<Match[]>(m.version,'competition')]);return {matches,records,competition};},!!cloudClient());
}));
/** The bundled summary stays lightweight; a newer remote generation is validated before use. */
export const preparedManifest=cache(async()=> (await preparedGeneration()).manifest);
export type RecordView=GenerationStatus&{manifest:RecordManifest;piece?:RecordMeta;rows:RecordRow[];smallRows:RecordRow[];page:number;smallPage:number;eras:Era[];eraTotal:number;filtered:boolean;exists:boolean;emptyReason?:'ranking';recomputed?:boolean};
function initial(g:PreparedGeneration):RecordView{return {manifest:g.manifest,source:g.source,fallbackReason:g.fallbackReason,rows:[],smallRows:[],page:1,smallPage:1,eras:[],eraTotal:0,filtered:false,exists:true};}
const key=(version:string,id:string)=>`reading-v2-${version}-${id}`;
/** A blob is usable only when every fragment arrives and the complete gzip decodes. */
export async function decodeCloudBlob<T>(payload:unknown,part:(index:number)=>Promise<unknown>,budget=6000):Promise<T|undefined>{
 let timeout:ReturnType<typeof setTimeout>|undefined;
 try{
   const decode=async()=>{
     if(!payload||typeof payload!=='object')return undefined;
     const index=payload as {gzip?:unknown;encoding?:unknown;chunks?:unknown};
     let encoded:string;
     if(typeof index.gzip==='string')encoded=index.gzip;
     else{
       if(index.encoding!=='gzip-chunks'||!Number.isInteger(index.chunks)||Number(index.chunks)<1||Number(index.chunks)>256)return undefined;
       const parts=await Promise.all(Array.from({length:Number(index.chunks)},(_,i)=>part(i)));
       if(parts.some(value=>!value||typeof value!=='object'||typeof (value as {chunk?:unknown}).chunk!=='string'||!(value as {chunk:string}).chunk.length))return undefined;
       encoded=parts.map(value=>(value as {chunk:string}).chunk).join('');
     }
     return JSON.parse(gunzipSync(Buffer.from(encoded,'base64')).toString()) as T;
   };
   return await Promise.race([decode(),new Promise<undefined>(resolve=>{timeout=setTimeout(()=>resolve(undefined),Math.max(1,budget));})]);
 }catch{return undefined;}finally{if(timeout)clearTimeout(timeout);}
}
async function cloudBlob<T>(version:string,id:string):Promise<T|undefined>{
 const deadline=Date.now()+25000,remaining=()=>Math.max(1,deadline-Date.now());
 const row=await query(key(version,id),'payload',remaining());
 if(!row?.payload||Date.now()>=deadline)return undefined;
 const index=row.payload as {encoding?:unknown;chunks?:unknown};
 if(index.encoding!=='gzip-chunks')return decodeCloudBlob<T>(row.payload,async()=>undefined,remaining());
 if(!Number.isInteger(index.chunks)||Number(index.chunks)<1||Number(index.chunks)>256)return undefined;
 const db=cloudClient();if(!db)return undefined;
 const keys=Array.from({length:Number(index.chunks)},(_,i)=>key(version,`${id}-chunk${i}`));
 const groups=Array.from({length:Math.ceil(keys.length/8)},(_,i)=>keys.slice(i*8,i*8+8));
 try{
  const rows=await Promise.all(groups.map(async group=>{
   const {data,error}=await db.from('deuce_archive_objects').select('key,payload').in('key',group).abortSignal(AbortSignal.timeout(remaining()));
   if(error||!data||data.length!==group.length)throw new Error('Incomplete snapshot blob');
   return data;
  }));
  const parts=new Map(rows.flat().map(part=>[part.key,part.payload]));
  const decoded=await decodeCloudBlob<T>(row.payload,async part=>parts.get(keys[part]),remaining());
  if(decoded===undefined)console.warn('Snapshot blob decode failed:',id);
  return decoded;
 }catch(error){console.warn('Snapshot blob read failed:',id,error instanceof Error?error.message:'unknown');return undefined;}
}
/** Request path only reads prepared data. No archive ingestion or tape analysis for unfiltered lists. */
export const recordView=cache(async(encoded:string,recomputed=false):Promise<RecordView>=>{
 const q:Record<string,string|undefined>=JSON.parse(encoded),g=await preparedGeneration(),m=g.manifest;
 const filtered=!!([q.year,q.surface,q.competition,q.era].some(v=>v&&v!=='all'));
 if(!q.dato){
   if(!filtered)return initial(g);
   const selected=await selectedArchive(g,q),catalog=await selectedCatalog(g,q);
   const pieces=catalog.map(piece=>{const big=piece.rows.filter(r=>!piece.percent||r.sample>=50),small=piece.percent?piece.rows.filter(r=>r.sample<50):[];const {rows:_,...meta}=piece;void _;return {...meta,total:big.length,smallTotal:small.length,leader:big[0],pagePrior:pageBoundaryTies(big),smallPagePrior:pageBoundaryTies(small)};});
   return {...initial(g),filtered:true,manifest:{...m,pieces,matchCount:selected.length,years:[...new Set(selected.map(match=>match.year))].sort((a,b)=>b-a)}};
 }
 if(filtered||recomputed||q.sort||q.min){
   const selected=await selectedArchive(g,q);
   const catalog=await selectedCatalog(g,q,q.dato),piece=catalog.find(p=>p.id===q.dato),view={...initial(g),filtered,recomputed,exists:m.pieces.some(p=>p.id===q.dato)};
   if(q.dato==='dos-epocas'){const rows=eraComparisons(selected,Number(q.corte)||2020);view.eraTotal=rows.length;view.page=clampPage(q.page,rows.length);view.eras=rows.slice((view.page-1)*PAGE_SIZE,view.page*PAGE_SIZE);return view;}
   if(!piece)return {...view,...(['top-10','top-5','numero-uno'].includes(q.dato)&&selected.length>0&&!selected.some(x=>x.context?.rank1||x.context?.rank2)?{emptyReason:'ranking' as const}:{})};
   const sortRows=(rows:RecordRow[])=>q.sort==='name'?[...rows].sort((a,b)=>a.name.localeCompare(b.name,'es')):q.sort==='sample'?[...rows].sort((a,b)=>b.sample-a.sample||b.value-a.value):rows;
   const requestedMinimum = Number(q.min);
   const sampleMinimum = piece.percent && [10,30,50,80,100].includes(requestedMinimum) ? requestedMinimum : 50;
   const big=sortRows(piece.rows.filter(r=>!piece.percent||r.sample>=sampleMinimum)),small=sortRows(piece.percent?piece.rows.filter(r=>r.sample<sampleMinimum):[]);
   const leader=piece.rows.find(row=>!piece.percent||row.sample>=sampleMinimum);
   view.piece={...piece,total:big.length,smallTotal:small.length,leader,pagePrior:pageBoundaryTies(big),smallPagePrior:pageBoundaryTies(small)};view.page=clampPage(q.page,big.length);view.smallPage=clampPage(q.smallPage,small.length);view.rows=big.slice((view.page-1)*PAGE_SIZE,view.page*PAGE_SIZE);view.smallRows=small.slice((view.smallPage-1)*PAGE_SIZE,view.smallPage*PAGE_SIZE);return view;
 }
 if(q.dato==='dos-epocas'){
   let eras:Record<string,Era[]>|undefined;
   if(g.source==='remote')eras=await cloudBlob<Record<string,Era[]>>(m.version,'eras');
   if(!eras){if(g.source==='remote')return recordView(encoded,true);eras=await local<Record<string,Era[]>>('eras');}
   const cut=m.eraCuts.includes(Number(q.corte))?String(q.corte):'2020',rows=eras[cut]||[],page=clampPage(q.page,rows.length);
   return {...initial(g),eras:rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE),eraTotal:rows.length,page};
 }
 const meta=m.pieces.find(p=>p.id===q.dato);
 if(!meta)return {...initial(g),exists:false};
 let page=clampPage(q.page,meta.total),smallPage=clampPage(q.smallPage,meta.smallTotal),rows:RecordRow[]|undefined,smallRows:RecordRow[]|undefined;
 if(g.source==='remote'){
   const mainChunk=pieceChunk(page),smallChunk=pieceChunk(smallPage);
   const [main,small]=mainChunk===smallChunk
     ? await query(key(m.version,`piece-${meta.id}-chunk${mainChunk}`),`main:payload->pages->p${page},small:payload->smallPages->p${smallPage}`,1200).then(row=>[row,row])
     : await Promise.all([query(key(m.version,`piece-${meta.id}-chunk${mainChunk}`),`main:payload->pages->p${page}`,1200),query(key(m.version,`piece-${meta.id}-chunk${smallChunk}`),`small:payload->smallPages->p${smallPage}`,1200)]);
   if(main&&small&&(meta.total===0||typeof main.main==='string'||Array.isArray(main.main))&&(meta.smallTotal===0||typeof small.small==='string'||Array.isArray(small.small))){
     try{
       const decode=(page:RecordRow[]|string|null)=>typeof page==='string'?JSON.parse(gunzipSync(Buffer.from(page,'base64')).toString()):page||[];
       rows=decode(main.main);smallRows=decode(small.small);
       if(!Array.isArray(rows)||!Array.isArray(smallRows)||rows.length!==Math.min(PAGE_SIZE,Math.max(0,meta.total-(page-1)*PAGE_SIZE))||smallRows.length!==Math.min(PAGE_SIZE,Math.max(0,meta.smallTotal-(smallPage-1)*PAGE_SIZE)))throw new Error('Incomplete record page');
     }catch{rows=undefined;smallRows=undefined;}
   }
 }
 if(!rows){
   if(g.source==='remote')return recordView(encoded,true);
   page=clampPage(q.page,meta.total);smallPage=clampPage(q.smallPage,meta.smallTotal);
   const piece=await local<RecordPages>(`piece-${meta.id}`);rows=piece.pages[String(page)]||[];smallRows=piece.smallPages[String(smallPage)]||[];
 }
 return {...initial(g),piece:meta,page,smallPage,rows,smallRows:smallRows||[]};
});

/** Same validated snapshot as Records; never opens the raw provider archive on navigation. */
export const preparedArchive = cache(async (): Promise<Match[]> => {
 return (await preparedGeneration()).matches();
});
export const preparedMatch = cache(async (id:string) => {const g=await preparedGeneration();return archiveIndex(await g.matches()).ids.get(id) || (await g.competition?.())?.find(m=>m.match_id===id);});

/** Matches and player aggregates always come from the same published generation. */
export const preparedPlayerArchive = cache(async () => {
 const generation=await preparedGeneration();
 const [matches,records]=await Promise.all([generation.matches(),generation.records()]);
 return {matches,records,manifest:generation.manifest,source:generation.source,fallbackReason:generation.fallbackReason};
});

export const preparedTournamentArchive=cache(async()=>{const g=await preparedGeneration();const [matches,entries]=await Promise.all([g.matches(),g.competition?.()||Promise.resolve([])]);return [...matches,...entries];});

export const preparedEditionAudit=cache(async()=>{const g=await preparedGeneration();const stored=g.source==='remote' ? await cloudBlob<import('../edition-audit').EditionAudit[]>(g.manifest.version,'audit') : await localOptional<import('../edition-audit').EditionAudit[]>('audit',[]);if(stored?.length)return stored;const [matches,competition]=await Promise.all([g.matches(),g.competition?.()||Promise.resolve([])]);return auditEditions([...matches,...competition]);});
