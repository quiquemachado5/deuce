import {searchRecordRows} from '../records-search';
import {selectPlayerCareer} from '../player-career';
import {playerSlug} from '../explore';
import {navigationKey,type NavigationIndex,type NavigationEntity} from '../navigation-products';
import 'server-only';
import {canonicalMatchId} from '../match-identity-aliases';
import {normalizedCompactSelection,type CompactMatchSelection} from './compact-selection';
export type {CompactMatchSelection} from './compact-selection';
import {registerArtifactPacks,readSnapshotArtifact,clearArtifactPacks} from './artifact-packs';
import {createReadStream} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createGunzip,gunzip} from 'node:zlib';
import {promisify} from 'node:util';
const gunzipAsync=promisify(gunzip);
import {Readable} from 'node:stream';
import {cache} from 'react';
import {requestGenerationSelection,generationSelectionKey} from './generation-selection';
import {cloudArchiveConfigured,cloudProbeRead} from '../cloud-archive';
import {asyncCache} from '../async-cache';
import type {Match} from '../types';
import type {PlayerRecord} from '../season-analytics';
import {eraComparisons,type Era,type RecordRow} from './records';
import {clampPage,pageBoundaryTies,pieceChunk,PAGE_SIZE,SNAPSHOT_SCHEMA,RULES_VERSION,type MatchPartition,type RecordManifest,type RecordMeta,type RecordPages} from './snapshot';
import {compatibleManifest,type PreparedGeneration,type GenerationStatus,type GenerationSourceDecision,type FallbackReason} from './generation';
import {selectedArchive, selectedCatalog} from './selection';
import {auditEditions,normalizeEditionAudits} from '../edition-audit';
import {readingDirectory} from '../reading-directory';
import {mergeTournamentEditionDetails} from '../tournament-edition-data';
import {circuitMatchContext} from '../match-context';
import {browserPartitionMatchesDetails,decodeMatchBrowserRow,MATCH_BROWSER_DICTIONARIES,MATCH_BROWSER_ROW_LENGTH,MATCH_BROWSER_SCHEMA,matchBrowserArtifact,type MatchBrowserIndex,type MatchBrowserPartition} from '../match-browser-snapshot';
import {normalizeCoverageReconciliation,reconcileCoverage,type CoverageReconciliation} from '../coverage-reconciliation';
import {normalizeText} from '../quality';
import historyBaseline from '../../ops/wta-history-baseline.json';
import {buildPublicationIndex,validPublicationIndex,type PublicationIndex} from '../publication-index';
import { ARCHIVE_PRODUCTS_SCHEMA, editionProductKey, type EditionProducts, type EloProducts, type PlayerDirectoryProducts, type SearchProducts, type TimeMachineProducts } from '../archive-products';
const IMMUTABLE_CACHE_MS = 86_400_000;
const bundled=asyncCache<unknown>(IMMUTABLE_CACHE_MS,48);
const uncachedBundledPrefixes=['matches-','browser-'] as const;
const uncachedBundledIds=new Set(['matches','competition','players','audit','reconciliation']);
export function shouldCacheBundledArtifact(id:string) {
 return !uncachedBundledIds.has(id)&&!uncachedBundledPrefixes.some(prefix=>id.startsWith(prefix));
}
async function readLocal<T>(id:string):Promise<T>{return JSON.parse((await gunzipAsync(await readFile(join(readingDirectory(),`${id}.json.gz`)))).toString()) as T;}
async function local<T>(id:string):Promise<T>{return shouldCacheBundledArtifact(id)?await bundled(id,()=>readLocal<T>(id)) as T:readLocal<T>(id);}
async function localOptional<T>(id:string,fallback:T):Promise<T>{try{return await local<T>(id);}catch{return fallback;}}
// Projection strings produce heterogeneous Supabase response shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const remotePointers=asyncCache<any>(300_000,4);
function remoteArtifactWeight(value:unknown,depth=0):number {
 if(depth>4||value===null||value===undefined)return 0;
 if(typeof value==='string')return Math.min(128*1024*1024,value.length*2);
 if(typeof value!=='object')return 16;
 if(Array.isArray(value))return Math.min(128*1024*1024,value.reduce((sum,item)=>sum+remoteArtifactWeight(item,depth+1),0));
 return Math.min(128*1024*1024,Object.values(value).reduce((sum,item)=>sum+remoteArtifactWeight(item,depth+1),0));
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const remoteArtifacts=asyncCache<any>(IMMUTABLE_CACHE_MS,16,undefined,{maxWeight:48*1024*1024,weight:remoteArtifactWeight});
const productArtifacts=asyncCache<unknown>(IMMUTABLE_CACHE_MS,8,undefined,{maxWeight:32*1024*1024,weight:remoteArtifactWeight});
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- every caller validates its projected payload.
async function query(key:string,projection='payload',budget=800):Promise<any>{
 const cache=/^reading-v2-[a-f0-9]{20}-/.test(key)?remoteArtifacts:remotePointers;
 try{return await cache(`${key}:${projection}`,async()=>{
  if(!cloudArchiveConfigured())return null;
  const payload=await readSnapshotArtifact(key,physical=>cloudProbeRead(physical,budget));
  if(payload===undefined)return undefined;
  if(projection==='payload')return {payload};
  const selected:Record<string,unknown>={};
  for(const field of projection.split(',')){
   const match=/^([a-zA-Z0-9_]+):payload->([a-zA-Z0-9_]+)->([a-zA-Z0-9_]+)$/.exec(field.trim());
   if(!match)throw new Error('Unsupported archive projection');
   const group=payload&&typeof payload==='object'?(payload as Record<string,unknown>)[match[2]]:undefined;
   selected[match[1]]=group&&typeof group==='object'?(group as Record<string,unknown>)[match[3]]:undefined;
  }
  return selected;
 });}catch{return undefined;}
}
export type RemoteProbeCircuit = {
 canAttempt:()=>boolean;
 succeeded:()=>void;
 failed:()=>void;
 state:()=>{failures:number;retryAt:number};
};
export function createRemoteProbeCircuit(now:()=>number=Date.now,delays:readonly number[]=[60_000,300_000,900_000]):RemoteProbeCircuit {
 let failures=0,retryAt=0;
 return {
  canAttempt:()=>now()>=retryAt,
  succeeded:()=>{failures=0;retryAt=0;},
  failed:()=>{failures++;retryAt=now()+(delays[Math.min(failures-1,delays.length-1)]??300_000);},
  state:()=>({failures,retryAt}),
 };
}
const manifestCircuit=createRemoteProbeCircuit();
const generations=asyncCache<PreparedGeneration>(300_000,1,g=>g.fallbackReason?30_000:300_000);
const snapshotSources=asyncCache<GenerationSourceDecision>(300_000,1,source=>source.fallbackReason?30_000:300_000);
export const preparedBundledManifest=cache(async()=>{
 const manifest=await local<RecordManifest>('manifest');
 if(manifest.schema!==SNAPSHOT_SCHEMA||manifest.rulesVersion!==RULES_VERSION)throw new Error('Reading snapshot is incompatible; run npm run build');
 return manifest;
});
const selectedSnapshotSource=requestGenerationSelection(async()=>snapshotSources('active',async()=>{
 const base=await preparedBundledManifest();
 const bundled=(fallbackReason?:FallbackReason):GenerationSourceDecision=>({manifest:base,source:'bundled',fallbackReason});
 if(!cloudArchiveConfigured())return bundled();
 if(!manifestCircuit.canAttempt())return bundled('remote-unavailable');
 const row=await query('reading-v2-manifest','payload',1200);
 const fresh=row===undefined?undefined:row===null?null:row?.payload;
 if(fresh===undefined){manifestCircuit.failed();return bundled('remote-unavailable');}
 if(fresh===null){manifestCircuit.succeeded();return bundled('not-published');}
 if(!compatibleManifest(fresh)){manifestCircuit.failed();return bundled('remote-incompatible');}
 if(fresh.version===base.version||Date.parse(fresh.generatedAt)<=Date.parse(base.generatedAt)){
  manifestCircuit.succeeded();
  return bundled();
 }
 registerArtifactPacks(fresh.version,fresh.artifactPacks);
 manifestCircuit.succeeded();
 return {manifest:fresh,source:'remote'};
}));

function rejectRemoteSnapshot(){
 manifestCircuit.failed();
 snapshotSources.clear();
 navigationIndexes.clear(); navigationEntities.clear(); generations.clear();
 remotePointers.clear();
 remoteArtifacts.clear();
 browserIndexes.clear();
 browserPartitions.clear();
 publicationIndexes.clear();
 clearArtifactPacks();
}

export const preparedGeneration=cache(async():Promise<PreparedGeneration>=>{
 const decision=await selectedSnapshotSource();
 return generations(generationSelectionKey(decision),async()=>{
 const base=await preparedBundledManifest();
 const bundledGeneration:PreparedGeneration={manifest:base,source:'bundled',matches:()=>preparedCompactArchive('all'),records:()=>local<PlayerRecord[]>('players'),competition:()=>localOptional<Match[]>('competition',[])};
 if(decision.source==='bundled')return {...bundledGeneration,fallbackReason:decision.fallbackReason};
 try{
  const [index,records,competition]=await Promise.all([
   cloudBlob<MatchBrowserIndex>(decision.manifest.version,'browser-index'),
   cloudBlob<PlayerRecord[]>(decision.manifest.version,'players'),
   cloudBlob<Match[]>(decision.manifest.version,'competition'),
  ]);
  const expectedCompetition=decision.manifest.competitionCount||0;
  if(!browserIndexMatchesManifest(index,decision.manifest)||!Array.isArray(records)||!records.length
    ||records.reduce((sum,player)=>sum+player.played,0)!==decision.manifest.matchCount*2
    ||(expectedCompetition>0&&(!Array.isArray(competition)||competition.length!==expectedCompetition)))throw new Error('Incomplete remote generation');
  return {manifest:decision.manifest,source:'remote' as const,
   matches:()=>preparedCompactArchive('all'),records:async()=>records,competition:async()=>competition||[]};
 }catch{
  rejectRemoteSnapshot();
  return {...bundledGeneration,fallbackReason:'remote-incomplete' as const};
 }
});
});
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
     return JSON.parse((await gunzipAsync(Buffer.from(encoded,'base64'))).toString()) as T;
   };
   return await Promise.race([decode(),new Promise<undefined>(resolve=>{timeout=setTimeout(()=>resolve(undefined),Math.max(1,budget));})]);
 }catch{return undefined;}finally{if(timeout)clearTimeout(timeout);}
}
async function decodeCloudBlobBuffer(payload:unknown,part:(index:number)=>Promise<unknown>,budget=6000):Promise<Buffer|undefined>{
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
     return Buffer.from(encoded,'base64');
   };
   return await Promise.race([decode(),new Promise<undefined>(resolve=>{timeout=setTimeout(()=>resolve(undefined),Math.max(1,budget));})]);
 }catch{return undefined;}finally{if(timeout)clearTimeout(timeout);}
}
async function cloudBlobBuffer(version:string,id:string):Promise<Buffer|undefined>{
 const deadline=Date.now()+25000,remaining=()=>Math.max(1,deadline-Date.now());
 const row=await query(key(version,id),'payload',remaining());
 if(!row?.payload||Date.now()>=deadline)return undefined;
 const index=row.payload as {encoding?:unknown;chunks?:unknown};
 if(index.encoding!=='gzip-chunks')return decodeCloudBlobBuffer(row.payload,async()=>undefined,remaining());
 if(!Number.isInteger(index.chunks)||Number(index.chunks)<1||Number(index.chunks)>256)return undefined;
 const keys=Array.from({length:Number(index.chunks)},(_,i)=>key(version,`${id}-chunk${i}`));
 const groups=Array.from({length:Math.ceil(keys.length/8)},(_,i)=>keys.slice(i*8,i*8+8));
 try{
  const rows=await Promise.all(groups.map(async group=>Promise.all(group.map(async partKey=>({key:partKey,payload:await readSnapshotArtifact(partKey,physical=>cloudProbeRead(physical,remaining()))})))));
  if(rows.flat().some(part=>part.payload===undefined))return undefined;
  const parts=new Map(rows.flat().map(part=>[part.key,part.payload]));
  return decodeCloudBlobBuffer(row.payload,async part=>parts.get(keys[part]),remaining());
 }catch{return undefined;}
}
async function cloudBlob<T>(version:string,id:string):Promise<T|undefined>{
 try{
  const encoded=await cloudBlobBuffer(version,id);
  if(!encoded)return undefined;
  return JSON.parse((await gunzipAsync(encoded)).toString()) as T;
 }catch(error){console.warn('Snapshot blob read failed:',id,error instanceof Error?error.message:'unknown');return undefined;}
}

/**
 * Inflate a published JSON array one object at a time. Detailed decade shards
 * contain thousands of point objects; JSON.parse would retain the whole object
 * graph and can consume more than a gigabyte for a 30 MB document.
 */
export async function selectCompressedArray<T>(input:Readable,predicate:(value:T)=>boolean,stopAfterFirst=false) {
 const stream=input.pipe(createGunzip());
 stream.setEncoding('utf8');
 const selected:T[]=[];
 let count=0,current='',depth=0,inString=false,escaped=false,started=false;
 for await(const raw of stream){
  const chunk=String(raw);
  for(let index=0;index<chunk.length;index++){
   const character=chunk[index];
   if(!started){
    if(character==='{'){started=true;depth=1;current='{';}
    continue;
   }
   current+=character;
   if(inString){
    if(escaped)escaped=false;
    else if(character==='\\')escaped=true;
    else if(character==='"')inString=false;
    continue;
   }
   if(character==='"'){inString=true;continue;}
   if(character==='{')depth++;
   else if(character==='}')depth--;
   if(depth!==0)continue;
   const value=JSON.parse(current) as T;
   count++;
   if(predicate(value)){
    selected.push(value);
    if(stopAfterFirst){stream.destroy();return {selected,count,complete:false};}
   }
   current='';started=false;
  }
 }
 if(started||depth!==0||inString)throw new Error('Incomplete compressed JSON array');
 return {selected,count,complete:true};
}

/** Request path only reads prepared data. No archive ingestion or tape analysis for unfiltered lists. */
export const recordView=cache(async(encoded:string,recomputed=false):Promise<RecordView>=>{
 const q:Record<string,string|undefined>={tour:'atp',...JSON.parse(encoded)},g=await preparedGeneration(),base=g.manifest,m=q.tour==='wta'&&base.circuitPieces?{...base,pieces:base.circuitPieces.wta}:base;
 const exactYear=q.year&&q.year!=='all'&&Number.isSafeInteger(Number(q.year))?Number(q.year):undefined;
 const lastTwenty=q.era==='last20'?new Date().getUTCFullYear()-19:undefined;
 const surface=(['hard','clay','grass','carpet','unknown'] as const).find(value=>value===q.surface);
 const loadSelection=()=>preparedCompactSelection({tour:q.tour==='wta'?'wta':'atp',fromYear:exactYear??lastTwenty,toYear:exactYear,surface,categories:q.competition&&q.competition!=='all'?[q.competition]:undefined});
 // A circuit filter matching the entire published snapshot needs no catalogue
 // recomputation. This keeps the ATP landing page fast while WTA is backfilled.
 const tourFiltered=(q.tour==='atp'||q.tour==='wta')
   ? q.tour==='wta'&&(!base.circuitPieces||q.dato==='dos-epocas')
   : !!(q.tour&&q.tour!=='all');
 const filtered=tourFiltered||!!([q.year,q.surface,q.competition,q.era].some(v=>v&&v!=='all'));
 if(!q.dato){
   if(!filtered)return {...initial(g),manifest:m};
   const selected=await selectedArchive(g,q,loadSelection),catalog=await selectedCatalog(g,q,undefined,loadSelection);
   const pieces=catalog.filter(piece=>piece.rows.length>0).map(piece=>{const big=piece.rows.filter(r=>!piece.percent||r.sample>=50),small=piece.percent?piece.rows.filter(r=>r.sample<50):[];const {rows:_,...meta}=piece;void _;return {...meta,total:big.length,smallTotal:small.length,leader:big[0],pagePrior:pageBoundaryTies(big),smallPagePrior:pageBoundaryTies(small)};});
   return {...initial(g),filtered:true,manifest:{...m,pieces,matchCount:selected.length,years:[...new Set(selected.map(match=>match.year))].sort((a,b)=>b-a)}};
 }
 if(!filtered&&!recomputed&&q.dato!=='dos-epocas'&&(q.find||q.sort||q.min)){
   const meta=m.pieces.find(piece=>piece.id===q.dato);if(!meta)return {...initial(g),exists:false};
   const stored=await preparedRecordPages(g,q.tour==='wta'?'wta-'+meta.id:meta.id,meta);
   const minimum=meta.percent&&[10,30,50,80,100].includes(Number(q.min))?Number(q.min):50;
   const main=Object.values(stored.pages).flat(),minor=Object.values(stored.smallPages).flat(),sequence=main.length>1?main:minor;
   const firstValue=sequence[0]?.value??0,nextValue=sequence.find(row=>row.value!==firstValue)?.value??firstValue;
   const direction=nextValue>firstValue?1:-1;
   const all=[...main,...minor].sort((a,b)=>direction*(a.value-b.value)||b.sample-a.sample||a.name.localeCompare(b.name,'es'));
   const sort=(rows:RecordRow[])=>q.sort==='name'?rows.sort((a,b)=>a.name.localeCompare(b.name,'es')):q.sort==='sample'?rows.sort((a,b)=>b.sample-a.sample||b.value-a.value):rows;
   const big=sort(searchRecordRows(all.filter(row=>!meta.percent||row.sample>=minimum),q.find||'')),small=sort(searchRecordRows(meta.percent?all.filter(row=>row.sample<minimum):[],q.find||''));
   const page=clampPage(q.page,big.length),smallPage=clampPage(q.smallPage,small.length);
   return {...initial(g),manifest:m,piece:{...meta,total:big.length,smallTotal:small.length},page,smallPage,rows:big.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE),smallRows:small.slice((smallPage-1)*PAGE_SIZE,smallPage*PAGE_SIZE)};
 }
 if(filtered||recomputed||q.sort||q.min){
   const selected=await selectedArchive(g,q,loadSelection);
   const catalog=await selectedCatalog(g,q,q.dato,loadSelection),piece=catalog.find(p=>p.id===q.dato),view={...initial(g),filtered,recomputed,exists:m.pieces.some(p=>p.id===q.dato)};
   if(q.dato==='dos-epocas'){const rows=eraComparisons(selected,Number(q.corte)||2020);view.eraTotal=rows.length;view.page=clampPage(q.page,rows.length);view.eras=rows.slice((view.page-1)*PAGE_SIZE,view.page*PAGE_SIZE);return view;}
   if(!piece)return {...view,...(['top-10','top-5','numero-uno'].includes(q.dato)&&selected.length>0&&!selected.some(x=>x.context?.rank1||x.context?.rank2)?{emptyReason:'ranking' as const}:{})};
   const sortRows=(rows:RecordRow[])=>q.sort==='name'?[...rows].sort((a,b)=>a.name.localeCompare(b.name,'es')):q.sort==='sample'?[...rows].sort((a,b)=>b.sample-a.sample||b.value-a.value):rows;
   const requestedMinimum = Number(q.min);
   const sampleMinimum = piece.percent && [10,30,50,80,100].includes(requestedMinimum) ? requestedMinimum : 50;
   const big=sortRows(searchRecordRows(piece.rows.filter(r=>!piece.percent||r.sample>=sampleMinimum),q.find||'')),small=sortRows(searchRecordRows(piece.percent?piece.rows.filter(r=>r.sample<sampleMinimum):[],q.find||''));
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
     ? await query(key(m.version,`piece-${q.tour==='wta'?'wta-':''}${meta.id}-chunk${mainChunk}`),`main:payload->pages->p${page},small:payload->smallPages->p${smallPage}`,1200).then(row=>[row,row])
     : await Promise.all([query(key(m.version,`piece-${q.tour==='wta'?'wta-':''}${meta.id}-chunk${mainChunk}`),`main:payload->pages->p${page}`,1200),query(key(m.version,`piece-${q.tour==='wta'?'wta-':''}${meta.id}-chunk${smallChunk}`),`small:payload->smallPages->p${smallPage}`,1200)]);
   if(main&&small&&(meta.total===0||typeof main.main==='string'||Array.isArray(main.main))&&(meta.smallTotal===0||typeof small.small==='string'||Array.isArray(small.small))){
     try{
       const decode=async(page:RecordRow[]|string|null):Promise<RecordRow[]>=>typeof page==='string'?JSON.parse((await gunzipAsync(Buffer.from(page,'base64'))).toString()):page||[];
       [rows,smallRows]=await Promise.all([decode(main.main),decode(small.small)]);
       if(!Array.isArray(rows)||!Array.isArray(smallRows)||rows.length!==Math.min(PAGE_SIZE,Math.max(0,meta.total-(page-1)*PAGE_SIZE))||smallRows.length!==Math.min(PAGE_SIZE,Math.max(0,meta.smallTotal-(smallPage-1)*PAGE_SIZE)))throw new Error('Incomplete record page');
     }catch{rows=undefined;smallRows=undefined;}
   }
 }
 if(!rows){
   if(g.source==='remote')return recordView(encoded,true);
   page=clampPage(q.page,meta.total);smallPage=clampPage(q.smallPage,meta.smallTotal);
   const piece=await local<RecordPages>(`piece-${q.tour==='wta'?'wta-':''}${meta.id}`);rows=piece.pages[String(page)]||[];smallRows=piece.smallPages[String(smallPage)]||[];
 }
 return {...initial(g),manifest:m,piece:meta,page,smallPage,rows,smallRows:smallRows||[]};
});

/** Same validated snapshot as Records; never opens the raw provider archive on navigation. */
export const preparedArchive = cache(async (): Promise<Match[]> => {
 return (await preparedGeneration()).matches();
});
const megabyte=1024*1024;
const browserIndexes=asyncCache<MatchBrowserIndex>(IMMUTABLE_CACHE_MS,2,undefined,{maxWeight:8*megabyte,weight:value=>value.count*36});
const browserPartitions=asyncCache<MatchBrowserPartition>(IMMUTABLE_CACHE_MS,12,undefined,{maxWeight:48*megabyte,weight:value=>value.count*1_200});
const decodedBrowserPartitions=asyncCache<Match[]>(IMMUTABLE_CACHE_MS,10,undefined,{maxWeight:48*megabyte,weight:value=>value.length*3_000});
// A decoded detailed row is dominated by nested point/statistic objects. The
// deliberately conservative weight makes every normal decade shard self-evict
// once its concurrent readers finish instead of pinning ~0.5–1 GB in the heap.
const fullPartitions=asyncCache<Match[]>(IMMUTABLE_CACHE_MS,2,undefined,{maxWeight:64*megabyte,weight:value=>value.length*120_000});
const matchDetails=asyncCache<Match|undefined>(IMMUTABLE_CACHE_MS,64);
const matchContexts=asyncCache<{match:Match|undefined;matches:Match[]}>(IMMUTABLE_CACHE_MS,32,undefined,{maxWeight:24*megabyte,weight:value=>(value.matches.length+1)*4_000});
const compactArchives=asyncCache<Match[]>(IMMUTABLE_CACHE_MS,2,undefined,{maxWeight:40*megabyte,weight:value=>value.length*3_000});
const compactSelections=asyncCache<Match[]>(IMMUTABLE_CACHE_MS,24,undefined,{maxWeight:64*megabyte,weight:value=>value.length*4_000});
const competitionArchives=asyncCache<Match[]>(IMMUTABLE_CACHE_MS,2,undefined,{maxWeight:32*megabyte,weight:value=>value.length*1_200});
const playerRecords=asyncCache<PlayerRecord[]>(IMMUTABLE_CACHE_MS,2,undefined,{maxWeight:16*megabyte,weight:value=>value.length*320});
const coverageReconciliations=asyncCache<CoverageReconciliation>(IMMUTABLE_CACHE_MS,2,undefined,{maxWeight:8*megabyte,weight:value=>value.issues.length*520});
const publicationIndexes=asyncCache<PublicationIndex>(IMMUTABLE_CACHE_MS,2,undefined,{maxWeight:32*megabyte,weight:value=>value.entries.length*180});
type BrowserSource={manifest:RecordManifest;index:MatchBrowserIndex;source:'bundled'|'remote';fallbackReason?:FallbackReason};
function validBrowserCircuit(value:MatchBrowserIndex['circuits']['atp']|undefined) {
 return !!value&&Array.isArray(value.years)&&Array.isArray(value.surfaces)&&Array.isArray(value.categories)
  &&Array.isArray(value.rounds)&&Array.isArray(value.events)&&Array.isArray(value.players)
  &&!!value.capabilities&&['statistics','points','fiveSets'].every(key=>typeof value.capabilities[key as keyof typeof value.capabilities]==='boolean');
}
function validPartitionMeta(value:unknown):value is MatchPartition {
 if(!value||typeof value!=='object')return false;
 const partition=value as MatchPartition,match=typeof partition.id==='string'?/^matches-(atp|wta)-(\d{4})s$/.exec(partition.id):null;
 return !!match&&(partition.tour==='atp'||partition.tour==='wta')&&match[1]===partition.tour
  &&Number.isSafeInteger(partition.fromYear)&&Number(match[2])===partition.fromYear
  &&Number.isSafeInteger(partition.toYear)&&partition.toYear===partition.fromYear+9
  &&Number.isSafeInteger(partition.count)&&partition.count>0;
}
function samePartitionMeta(first:MatchPartition,second:MatchPartition) {
 return first.id===second.id&&first.tour===second.tour&&first.fromYear===second.fromYear&&first.toYear===second.toYear&&first.count===second.count;
}
export function browserIndexMatchesManifest(value:MatchBrowserIndex|undefined,manifest:Pick<RecordManifest,'matchCount'|'matchPartitions'>):value is MatchBrowserIndex {
 const expected=manifest.matchPartitions;
 if(!expected?.length||!expected.every(validPartitionMeta)||new Set(expected.map(partition=>partition.id)).size!==expected.length)return false;
 return value?.schema===MATCH_BROWSER_SCHEMA&&value.count===manifest.matchCount&&Array.isArray(value.partitions)&&value.partitions.length===expected.length
  &&value.partitions.every(validPartitionMeta)
  &&new Set(value.partitions.map(partition=>partition.id)).size===value.partitions.length
  &&value.partitions.reduce((sum,partition)=>sum+partition.count,0)===manifest.matchCount
  &&expected.reduce((sum,partition)=>sum+partition.count,0)===manifest.matchCount
  &&expected.every(partition=>{
   const candidate=value.partitions.find(item=>item.id===partition.id);
   return !!candidate&&samePartitionMeta(candidate,partition);
  })
  &&validBrowserCircuit(value.circuits?.atp)&&validBrowserCircuit(value.circuits?.wta);
}
export function browserPartitionMatchesManifest(value:MatchBrowserPartition|undefined,meta:MatchPartition):value is MatchBrowserPartition {
 return validPartitionMeta(meta)&&value?.schema===MATCH_BROWSER_SCHEMA&&samePartitionMeta(value,meta)
  &&!!value.dictionaries&&MATCH_BROWSER_DICTIONARIES.every(key=>Array.isArray(value.dictionaries[key as keyof typeof value.dictionaries]))
  &&(!value.search||(['players','tournaments','categories','rounds'] as const).every(key=>Array.isArray(value.search?.[key])&&value.search?.[key].length===value.dictionaries[key].length))
  &&Array.isArray(value.rows)&&value.rows.length===meta.count
  &&value.rows.every(row=>Array.isArray(row)&&row.length===MATCH_BROWSER_ROW_LENGTH&&typeof row[0]==='string');
}
async function loadBrowserPartition(source:GenerationSourceDecision,meta:NonNullable<RecordManifest['matchPartitions']>[number]) {
 const cacheKey=`${source.manifest.version}:${source.source}:${meta.id}`;
 return browserPartitions(cacheKey,async()=>{
  const id=matchBrowserArtifact(meta.id);
  const stored=source.source==='remote'
   ? await cloudBlob<MatchBrowserPartition>(source.manifest.version,id)
   : await localOptional<MatchBrowserPartition|undefined>(id,undefined);
  if(browserPartitionMatchesManifest(stored,meta))return stored;
  throw new Error(`${source.source==='remote'?'Incomplete remote':'Missing'} match browser partition: ${meta.id}`);
 });
}
async function selectedBrowserSource(){
 const decision=await preparedGeneration();
 const base=decision.manifest;
 const localIndex=async()=>browserIndexes(`${base.version}:bundled`,async()=>{
   const stored=await localOptional<MatchBrowserIndex|undefined>('browser-index',undefined);
   if(browserIndexMatchesManifest(stored,base))return stored;
   throw new Error('Bundled match browser index is missing or incompatible');
 });
 if(decision.source==='bundled')return {...decision,index:await localIndex()};
 const index=await browserIndexes(`${base.version}:remote`,async()=>await cloudBlob<MatchBrowserIndex>(base.version,'browser-index') as MatchBrowserIndex);
 if(!browserIndexMatchesManifest(index,base)){
  rejectRemoteSnapshot();
  throw new Error(`Incomplete remote match browser index: ${base.version}`);
 }
 return {...decision,index};
}

export const preparedMatchBrowserIndex=cache(selectedBrowserSource);

export function fullPartitionMatchesManifest(rows:Match[]|undefined,meta:MatchPartition):rows is Match[] {
 return validPartitionMeta(meta)&&!!rows&&rows.length===meta.count&&new Set(rows.map(match=>match.match_id)).size===rows.length
  &&rows.every(match=>(match.tour||'atp')===meta.tour&&match.year>=meta.fromYear&&match.year<=meta.toYear&&match.data_source!=='mock');
}

async function loadFullPartition(source:GenerationSourceDecision,meta:NonNullable<RecordManifest['matchPartitions']>[number]) {
 const cacheKey=`${source.manifest.version}:${source.source}:${meta.id}`;
 return fullPartitions(cacheKey,async()=>{
  let browser:MatchBrowserPartition;
  try{browser=await loadBrowserPartition(source,meta);}catch(error){if(source.source==='remote')rejectRemoteSnapshot();throw error;}
  const rows=source.source==='remote'
   ? await cloudBlob<Match[]>(source.manifest.version,meta.id)
   : await localOptional<Match[]|undefined>(meta.id,undefined);
  if(fullPartitionMatchesManifest(rows,meta)&&browserPartitionMatchesDetails(browser,rows))return rows;
  if(source.source==='remote')rejectRemoteSnapshot();
  throw new Error(`Incomplete ${source.source} match partition: ${meta.id}`);
 });
}

async function selectFullPartition(
 source:GenerationSourceDecision,
 meta:NonNullable<RecordManifest['matchPartitions']>[number],
 predicate:(match:Match)=>boolean,
 stopAfterFirst=false,
) {
 let browser:MatchBrowserPartition;
 try{browser=await loadBrowserPartition(source,meta);}catch(error){if(source.source==='remote')rejectRemoteSnapshot();throw error;}
 const compressed=source.source==='remote'?await cloudBlobBuffer(source.manifest.version,meta.id):undefined;
 if(source.source==='remote'&&!compressed){rejectRemoteSnapshot();throw new Error(`Missing remote match partition: ${meta.id}`);}
 const input=compressed?Readable.from([compressed]):createReadStream(join(readingDirectory(),`${meta.id}.json.gz`));
 const ids=new Set<string>();
 const result=await selectCompressedArray<Match>(input,match=>{
  if((match.tour||'atp')!==meta.tour||match.year<meta.fromYear||match.year>meta.toYear||match.data_source==='mock')throw new Error(`Invalid match in ${meta.id}`);
  if(ids.has(match.match_id))throw new Error(`Duplicate match in ${meta.id}`);ids.add(match.match_id);
  return predicate(match);
 },stopAfterFirst);
 if(result.complete&&(result.count!==meta.count||ids.size!==meta.count||!browserPartitionMatchesDetails(browser,[...ids].map(match_id=>({match_id} as Match))))) {
  if(source.source==='remote')rejectRemoteSnapshot();
  throw new Error(`Incomplete ${source.source} match partition: ${meta.id}`);
 }
 return result.selected;
}

async function loadPartitionedArchive(source:GenerationSourceDecision,tour?:'atp'|'wta') {
 const metas=(source.manifest.matchPartitions||[]).filter(partition=>!tour||partition.tour===tour);
 if(!metas.length)throw new Error(`Missing ${tour?tour.toUpperCase():'full'} match partitions`);
 const rows=(await Promise.all(metas.map(meta=>loadFullPartition(source,meta)))).flat();
 const expected=tour
  ? source.manifest.circuitCoverage?.[tour].matches??source.manifest.summary.tours[tour]
  : source.manifest.matchCount;
 if(rows.length!==expected)throw new Error(`Incomplete ${tour?tour.toUpperCase():'full'} archive: ${rows.length} of ${expected}`);
 return rows;
}

/** Compact navigation data; match details stay compressed until their page is opened. */
export const preparedMatchBrowser=cache(async(tour:'atp'|'wta'|'all',fromYear?:number,toYear?:number)=>{
 const selected=await selectedBrowserSource();
 const loadPartitions=async(source:BrowserSource)=>{
   const metas=source.index.partitions.filter(partition=>(tour==='all'||partition.tour===tour)
   &&(fromYear===undefined||partition.toYear>=fromYear)&&(toYear===undefined||partition.fromYear<=toYear));
   return Promise.all(metas.map(meta=>loadBrowserPartition(source,meta)));
 };
 try{return {...selected,partitions:await loadPartitions(selected)};}
 catch(error){
   if(selected.source==='remote')rejectRemoteSnapshot();
   throw new Error(selected.source==='remote'
     ? `Remote match browser does not match selected generation ${selected.manifest.version}`
     : 'Bundled match browser is incomplete',{cause:error});
 }
});

/** Compact public summaries for directory, tournament and relationship views. */
function compactArchive(browser:Awaited<ReturnType<typeof preparedMatchBrowser>>,tour:'atp'|'wta'|'all') {
 return compactArchives(`${browser.manifest.version}:${browser.source}:${tour}`,async()=>(await Promise.all(browser.partitions.map(partition=>
  decodedBrowserPartitions(`${browser.manifest.version}:${browser.source}:${partition.id}`,async()=>partition.rows.map(row=>decodeMatchBrowserRow(partition,row)))))).flat());
}
export const preparedCompactArchive=cache(async(tour:'atp'|'wta'|'all'='all')=>compactArchive(await preparedMatchBrowser(tour),tour));

/**
 * Load the small immutable ledger when available. Older generations are
 * migrated one compact decade at a time, never as one decoded match array.
 */
export const preparedPublicationIndex=cache(async()=>{
 const source=await selectedBrowserSource(),cacheKey=`${source.manifest.version}:${source.source}`;
 return publicationIndexes(cacheKey,async()=>{
  const stored=source.source==='remote'
   ?await cloudBlob<PublicationIndex>(source.manifest.version,'publication-index')
   :await localOptional<PublicationIndex|undefined>('publication-index',undefined);
  if(validPublicationIndex(stored)&&stored.count===source.manifest.matchCount)return stored;
  const entries:PublicationIndex['entries']=[],seen=new Set<string>();
  for(const meta of source.index.partitions){
   const partition=await loadBrowserPartition(source,meta);
   const index=buildPublicationIndex(partition.rows.map(row=>decodeMatchBrowserRow(partition,row)));
   for(const entry of index.entries){if(seen.has(entry.identity))throw new Error(`Duplicate published identity: ${entry.identity}`);seen.add(entry.identity);entries.push(entry);}
  }
  entries.sort((a,b)=>a.identity.localeCompare(b.identity));
  const migrated:PublicationIndex={schema:1,count:entries.length,entries};
  if(!validPublicationIndex(migrated)||migrated.count!==source.manifest.matchCount)throw new Error('Publication index does not match selected generation');
  return migrated;
 });
});

const navigationEntities=asyncCache<NavigationEntity>(IMMUTABLE_CACHE_MS,48,undefined,{maxWeight:24*1024*1024,weight:remoteArtifactWeight});
const navigationIndexes=asyncCache<NavigationIndex|undefined>(IMMUTABLE_CACHE_MS,2);
async function navigationIndex(source:Awaited<ReturnType<typeof selectedBrowserSource>>){
 return navigationIndexes(`${source.source}:${source.manifest.version}`,async()=>{
  if(source.source==='remote'&&!source.manifest.artifactPacks?.['navigation-index'])return undefined;
  const index=source.source==='remote'?await cloudBlob<NavigationIndex>(source.manifest.version,'navigation-index'):await localOptional<NavigationIndex|undefined>('navigation-index',undefined);
  if(!index)return undefined;
  if(index.schema!==1||index.count!==source.manifest.matchCount)throw new Error('Navigation index does not match active generation');
  return index;
 });
}
async function navigationEntity(source:Awaited<ReturnType<typeof selectedBrowserSource>>,id:string){
 return navigationEntities(`${source.source}:${source.manifest.version}:${id}`,async()=>{
  const entity=source.source==='remote'?await cloudBlob<NavigationEntity>(source.manifest.version,id):await local<NavigationEntity>(id);
  if(entity?.schema!==1||entity.partition?.id!==id)throw new Error('Missing navigation entity in selected generation');
  return entity;
 });
}
export const preparedIndexedPlayer=cache(async(slug:string,tour:'atp'|'wta')=>{
 const source=await selectedBrowserSource(),index=await navigationIndex(source);if(!index)return undefined;
 const id=Object.entries(index.players).find(([name])=>name.startsWith(tour+':')&&playerSlug(name.slice(4))===slug)?.[1];if(!id)return null;
 const entity=await navigationEntity(source,id);if(!entity.record)return undefined;
 const matches=entity.partition.rows.map(row=>decodeMatchBrowserRow(entity.partition,row)),records=[entity.record];
 const selected=selectPlayerCareer(matches,records,slug,tour);
 return selected?{manifest:source.manifest,source:source.source,fallbackReason:source.fallbackReason,matches,records,...selected}:null;
});
export const preparedTournamentOverview=cache(async(name:string,tour:'atp'|'wta',category:string)=>{
 const source=await selectedBrowserSource(),index=await navigationIndex(source),id=index?.tournaments[navigationKey(tour,name)];
 return id?(await navigationEntity(source,id)).overviews?.[category]:undefined;
});

/** Decode only rows relevant to a view; raw compact tuples are scanned in bounded decade shards. */
export async function preparedCompactSelection(selection:CompactMatchSelection) {
 const normalized=normalizedCompactSelection(selection);
 const source=await selectedBrowserSource();
 const cacheKey=`${source.manifest.version}:${source.source}:${JSON.stringify(normalized)}`;
 return compactSelections(cacheKey,async()=>{
  const result:Match[]=[];
  const ids=normalized.ids?new Set(normalized.ids):undefined;
  const players=normalized.players?new Set(normalized.players):undefined;
  const rounds=normalized.rounds?new Set(normalized.rounds):undefined;
  const categories=normalized.categories?new Set(normalized.categories):undefined;
  const index=normalized.players?.length||normalized.tournament?await navigationIndex(source):undefined;
  let selected:MatchBrowserPartition[]|undefined;
  if(index){
   const tours=normalized.tour==='all'?['atp','wta'] as const:[normalized.tour] as const;
   const entityIds=new Set<string>();
   for(const tour of tours)for(const name of normalized.players?.length?normalized.players:[normalized.tournament!]){
    const id=index[normalized.players?.length?'players':'tournaments'][navigationKey(tour,name)];if(id)entityIds.add(id);
   }
   selected=[];for(const id of entityIds)selected.push((await navigationEntity(source,id)).partition);
  }
  const metas=(source.manifest.matchPartitions||[]).filter(meta=>(normalized.tour==='all'||meta.tour===normalized.tour)
    &&(normalized.fromYear===undefined||meta.toYear>=normalized.fromYear)&&(normalized.toYear===undefined||meta.fromYear<=normalized.toYear));
  const prefetched=selected??(metas.length<=3?await Promise.all(metas.map(meta=>loadBrowserPartition(source,meta))):undefined);
  const seen=new Set<string>();
  for(let metaIndex=0;metaIndex<(selected?selected.length:metas.length);metaIndex++){
   const partition=prefetched?.[metaIndex]||await loadBrowserPartition(source,metas[metaIndex]),d=partition.dictionaries;
   const playerIndexes=players?new Set(d.players.flatMap((name,index)=>players.has(normalizeText(name))?[index]:[])):undefined;
   const tournamentIndexes=normalized.tournament?new Set(d.tournaments.flatMap((name,index)=>normalizeText(name)===normalized.tournament?[index]:[])):undefined;
   const roundIndexes=rounds?new Set(d.rounds.flatMap((name,index)=>rounds.has(normalizeText(name))?[index]:[])):undefined;
   const categoryIndexes=categories?new Set(d.categories.flatMap((name,index)=>categories.has(normalizeText(name))?[index]:[])):undefined;
   for(const row of partition.rows){
    if(normalized.fromYear!==undefined&&row[1]<normalized.fromYear||normalized.toYear!==undefined&&row[1]>normalized.toYear)continue;
    if(ids&&!ids.has(row[0]))continue;
    if(playerIndexes&&!playerIndexes.has(row[6])&&!playerIndexes.has(row[8]))continue;
    if(tournamentIndexes&&!tournamentIndexes.has(row[2]))continue;
    if(roundIndexes&&!roundIndexes.has(row[5])&&!roundIndexes.has(row[42]))continue;
    if(categoryIndexes&&!categoryIndexes.has(row[3])&&!categoryIndexes.has(row[41]))continue;
    if(normalized.surface&&row[4]!==({hard:0,clay:1,grass:2,carpet:3,unknown:4} as const)[normalized.surface])continue;
    const identity=`${partition.tour}:${row[0]}`;if(seen.has(identity))continue;seen.add(identity);
    result.push(decodeMatchBrowserRow(partition,row));
   }
  }
  return result;
 });
}

/** Tournament landing pages only decode the event represented by the URL. */
export const preparedTournamentSummaryArchive=cache(async(slug:string)=>{
 const source=await selectedBrowserSource(),rows:Match[]=[];
 const events=(['atp','wta'] as const).flatMap(tour=>source.index.circuits[tour].events
  .filter(event=>event.slug===slug).map(event=>({tour,name:event.name})));
 for(const event of events)rows.push(...await preparedCompactSelection({tour:event.tour,tournament:event.name}));
 return rows;
});

/** Sitemaps need public identity and dates, never the full point/stat payload. */
export const preparedMatchSitemapArchive=cache(async(year:number)=>{
 const browser=await preparedMatchBrowser('all',year,year);
 const rows=(await Promise.all(browser.partitions.map(partition=>
  decodedBrowserPartitions(`${browser.manifest.version}:${browser.source}:${partition.id}`,async()=>partition.rows.map(row=>decodeMatchBrowserRow(partition,row)))))).flat();
 return rows.filter(match=>match.year===year);
});

async function selectedPlayerRecords(source:GenerationSourceDecision) {
 return playerRecords(`${source.manifest.version}:${source.source}`,async()=>{
  const rows=source.source==='remote'
   ? await cloudBlob<PlayerRecord[]>(source.manifest.version,'players')
   : await localOptional<PlayerRecord[]|undefined>('players',undefined);
  if(Array.isArray(rows)&&rows.length>0&&rows.reduce((sum,player)=>sum+player.played,0)===source.manifest.matchCount*2)return rows;
  if(source.source==='remote')rejectRemoteSnapshot();
  throw new Error(`Incomplete ${source.source} player archive`);
 });
}

/** Player suggestions only open the aggregate artifact for the selected generation. */
export const preparedPlayerRecords = cache(async () => {
 const source=await preparedGeneration();
 return {records:await selectedPlayerRecords(source),manifest:source.manifest,source:source.source,fallbackReason:source.fallbackReason};
});

async function preparedProduct<T extends {schema:number}>(id:string) {
 const source=await preparedGeneration(),cacheKey=`${source.manifest.version}:${source.source}:${id}`;
 return productArtifacts(cacheKey,async()=>{
  const artifact=source.source==='remote'
   ? await cloudBlob<T>(source.manifest.version,id)
   : await localOptional<T|undefined>(id,undefined);
  if(!artifact||artifact.schema!==ARCHIVE_PRODUCTS_SCHEMA)throw new Error(`Missing or incompatible ${id} product`);
  return artifact;
 }) as Promise<T>;
}

export const preparedEditionProducts=cache(()=>preparedProduct<EditionProducts>('edition-products'));
export const preparedPlayerDirectoryProducts=cache(()=>preparedProduct<PlayerDirectoryProducts>('player-directory'));
export const preparedSearchProducts=cache(()=>preparedProduct<SearchProducts>('search-products'));
export const preparedEloProducts=cache(()=>preparedProduct<EloProducts>('elo-products'));
export const preparedTimeMachineProducts=cache(()=>preparedProduct<TimeMachineProducts>('time-machine'));
export const preparedTournamentEditionProduct=cache(async(year:number,tour:'atp'|'wta',slug:string,category:string)=>{
 const products=await preparedEditionProducts();
 return products.editions[editionProductKey(tour,slug,year,category)];
});

/** Profiles and rivalries use summaries plus aggregates from one immutable generation. */
export const preparedPlayerSummaryArchive = cache(async () => {
 const browser=await preparedMatchBrowser('all');
 const [matches,records]=await Promise.all([compactArchive(browser,'all'),selectedPlayerRecords(browser)]);
 return {matches,records,manifest:browser.manifest,source:browser.source,fallbackReason:browser.fallbackReason};
});

/** Metric shelves still require full statistics and point tapes. */
export const preparedPlayerArchive = cache(async () => {
 const generation=await preparedGeneration();
 const [matches,records]=await Promise.all([generation.matches(),generation.records()]);
 return {matches,records,manifest:generation.manifest,source:generation.source,fallbackReason:generation.fallbackReason};
});

/**
 * A validated browser summary is a truthful result-only fallback when the
 * larger remote detail shard is temporarily unavailable. It never triggers a
 * provider request and never promotes missing statistics or point data.
 */
export async function recoverMatchDetail(
 source:'bundled'|'remote',
 summary:Match|undefined,
 error:unknown,
 resetRemote:()=>void,
 loadBundled:()=>Promise<Match|undefined>,
) {
 if(source!=='remote')throw error;
 resetRemote();
 return summary||loadBundled();
}

/** Only the requested circuit's full-detail partitions are inflated. */
export const preparedTourArchive=cache(async(tour:'atp'|'wta'):Promise<Match[]>=>{
 return loadPartitionedArchive(await preparedGeneration(),tour);
});

/** Detail readers never allocate the relationship array used by the page. */
export const preparedMatchDetail=cache(async(id:string)=>{
 id=canonicalMatchId(id);
 let source=await preparedGeneration();
 return matchDetails(`${source.manifest.version}:${source.source}:${id}`,async()=>{
  let summary:Match|undefined;
  const load=async()=>{
   const locator=(await preparedPublicationIndex()).entries.find(entry=>entry.identity.endsWith(`:${id}`));
   const selected=(await preparedCompactSelection({ids:[id],...(locator?{tour:locator.tour,fromYear:locator.year,toYear:locator.year}:{})}))[0];
   summary=selected;
   if(!selected)return (await selectedCompetition(source)).find(candidate=>candidate.match_id===id);
   const meta=source.manifest.matchPartitions?.find(partition=>partition.tour===(selected.tour||'atp')&&selected.year>=partition.fromYear&&selected.year<=partition.toYear);
   if(!meta)throw new Error(`Missing detail partition for ${id}`);
   const match=(await selectFullPartition(source,meta,candidate=>candidate.match_id===id,true))[0];
   if(!match)throw new Error(`Match ${id} is absent from ${meta.id}`);
   return match;
  };
  try{return await load();}
  catch(error){
   return recoverMatchDetail(source.source,summary,error,rejectRemoteSnapshot,async()=>{
    source=await preparedGeneration();
    return load();
   });
  }
 });
});

export const preparedMatch=preparedMatchDetail;

export const preparedMatchContext=cache(async(id:string)=>{
 id=canonicalMatchId(id);
 const source=await preparedGeneration();
 return matchContexts(`${source.manifest.version}:${source.source}:${id}`,async()=>{
  const match=await preparedMatchDetail(id);
  if(!match)return {match,matches:[] as Match[]};
  const tour=match.tour||'atp';
  const summaries=(await preparedCompactSelection({tour,players:[match.player1.name]})).filter(item=>
    normalizeText(item.player1.name)===normalizeText(match.player2.name)||normalizeText(item.player2.name)===normalizeText(match.player2.name));
  if(!summaries.some(item=>item.match_id===match.match_id))summaries.push(match);
  return {match,matches:circuitMatchContext(summaries,match)};
 });
});

async function selectedCompetition(source:GenerationSourceDecision) {
 return competitionArchives(`${source.manifest.version}:${source.source}`,async()=>{
  const rows=source.source==='remote'
   ? await cloudBlob<Match[]>(source.manifest.version,'competition')
   : await localOptional<Match[]>('competition',[]);
  if(Array.isArray(rows)&&rows.length===(source.manifest.competitionCount||0))return rows;
  if(source.source==='remote')rejectRemoteSnapshot();
  throw new Error(`Incomplete ${source.source} competition archive`);
 });
}

/** One edition opens at most the full decade shards that can contain it. */
export const preparedTournamentArchive=cache(async(year:number,tour:'atp'|'wta'|'all'='all')=>{
 if(!Number.isSafeInteger(year))return [];
 const source=await preparedGeneration();
 const metas=(source.manifest.matchPartitions||[]).filter(partition=>year>=partition.fromYear&&year<=partition.toYear&&(tour==='all'||partition.tour===tour));
 const details:Match[]=[];
 // Keep at most one edition in memory and never inflate ATP and WTA decade
 // shards concurrently.
 for(const meta of metas)details.push(...await selectFullPartition(source,meta,match=>match.year===year));
 const [summaries,competition]=await Promise.all([preparedCompactSelection({tour,fromYear:year,toYear:year}),selectedCompetition(source)]);
 return mergeTournamentEditionDetails(summaries,details,competition,year,tour);
});

/**
 * Edition pages only need one event and one circuit. Select the matching rows
 * while the decade shard is streamed instead of materialising every event in
 * the season (or both tours) before the page can render.
 */
export const preparedTournamentEditionArchive=cache(async(year:number,tour:'atp'|'wta',tournament:string)=>{
 if(!Number.isSafeInteger(year)||!tournament)return [];
 const source=await preparedGeneration();
 const normalizedTournament=normalizeText(tournament);
 const metas=(source.manifest.matchPartitions||[]).filter(partition=>partition.tour===tour&&year>=partition.fromYear&&year<=partition.toYear);
 const details:Match[]=[];
 for(const meta of metas)details.push(...await selectFullPartition(source,meta,match=>match.year===year&&normalizeText(match.tournament)===normalizedTournament));
 const [summaries,competition]=await Promise.all([
  preparedCompactSelection({tour,tournament,fromYear:year,toYear:year}),
  selectedCompetition(source),
 ]);
 const relevantCompetition=competition.filter(match=>(match.tour||'atp')===tour&&normalizeText(match.tournament)===normalizedTournament);
 return mergeTournamentEditionDetails(summaries,details,relevantCompetition,year,tour);
});

export const preparedEditionAudit=cache(async()=>{const g=await preparedGeneration();const stored=g.source==='remote' ? await cloudBlob<import('../edition-audit').EditionAudit[]>(g.manifest.version,'audit') : await localOptional<import('../edition-audit').EditionAudit[]>('audit',[]);if(stored?.length)return normalizeEditionAudits(stored);const [matches,competition]=await Promise.all([g.matches(),g.competition?.()||Promise.resolve([])]);return auditEditions([...matches,...competition]);});

export const preparedCoverageReconciliation=cache(async()=>{
 const generation=await preparedGeneration(),cacheKey=`${generation.manifest.version}:${generation.source}`;
 return coverageReconciliations(cacheKey,async()=>{
  const stored=generation.source==='remote'
   ? await cloudBlob<CoverageReconciliation>(generation.manifest.version,'reconciliation')
   : await localOptional<CoverageReconciliation|undefined>('reconciliation',undefined);
  if(stored?.summary&&Array.isArray(stored.issues))return normalizeCoverageReconciliation(stored,await preparedEditionAudit());
  const [matches,audit]=await Promise.all([preparedCompactArchive('all'),preparedEditionAudit()]);
  return reconcileCoverage(matches,audit,historyBaseline.allowedPendingCohorts);
 });
});

export function preparedDataCacheDiagnostics() {
 return Object.fromEntries(Object.entries({bundled,remotePointers,remoteArtifacts,productArtifacts,generations,snapshotSources,browserIndexes,browserPartitions,decodedBrowserPartitions,fullPartitions,matchDetails,matchContexts,compactArchives,compactSelections,competitionArchives,playerRecords,coverageReconciliations,publicationIndexes})
  .map(([name,cache])=>[name,cache.stats()]));
}

export function invalidatePreparedGeneration() { navigationIndexes.clear(); navigationEntities.clear(); generations.clear(); snapshotSources.clear(); browserIndexes.clear(); browserPartitions.clear(); decodedBrowserPartitions.clear(); fullPartitions.clear(); matchDetails.clear(); matchContexts.clear(); compactArchives.clear(); compactSelections.clear(); competitionArchives.clear(); playerRecords.clear(); coverageReconciliations.clear(); publicationIndexes.clear(); remotePointers.clear(); remoteArtifacts.clear(); productArtifacts.clear(); clearArtifactPacks(); manifestCircuit.succeeded(); }

/** Optional on older immutable generations; never fabricate historical change dates. */
export const preparedPageRevisions=cache(async()=>{
 const source=await preparedGeneration();
 const value=source.source==='remote'?await cloudBlob<import('../publication-pages').PageRevisions>(source.manifest.version,'page-revisions'):await localOptional<import('../publication-pages').PageRevisions|undefined>('page-revisions',undefined);
 if(value){const {validPageRevisions}=await import('../publication-pages');if(!validPageRevisions(value))throw new Error('Invalid page revision index');}
 return value;
});

/** A small public feed, read from the same generation without loading the SEO index. */
export const preparedCorrections=cache(async()=>{
 const {validCorrection}=await import('../publication-pages');
 const source=await preparedGeneration();
 const rows=source.source==='remote'
   ?await cloudBlob<unknown>(source.manifest.version,'correction-history')
   :await localOptional<unknown>('correction-history',[]);
 return Array.isArray(rows)?rows.filter(validCorrection):[];
});

/** Small, generation-bound projections: no match enumeration in sitemap/coverage requests. */
export const preparedPublicArchive=cache(async()=>{
 const source=await preparedGeneration();
 const value=source.source==='remote'&&source.manifest.artifactPacks?.['public-archive']
  ? await cloudBlob<import('../public-archive-products').PublicArchiveProducts>(source.manifest.version,'public-archive')
  : source.source==='bundled'?await localOptional<import('../public-archive-products').PublicArchiveProducts|undefined>('public-archive',undefined):undefined;
 if(value?.schema===1&&value.version===source.manifest.version)return value;
 // Migration fallback is process-cached and disappears on the next publication.
 return publicArchiveFallback(source.manifest.version+':'+source.source,async()=>{
  const {compilePublicArchiveProducts}=await import('../public-archive-products');
  const [matches,players,revisions,audit]=await Promise.all([preparedCompactArchive('all'),preparedPlayerRecords(),preparedPageRevisions(),preparedEditionAudit()]);
  return compilePublicArchiveProducts(matches,players.records,source.manifest,revisions,audit);
 });
});
const publicArchiveFallback=asyncCache<import('../public-archive-products').PublicArchiveProducts>(IMMUTABLE_CACHE_MS,2);

async function preparedRecordPages(g:PreparedGeneration,id:string,meta:RecordMeta):Promise<RecordPages>{
 if(g.source!=='remote')return local<RecordPages>('piece-'+id);
 const pages:RecordPages={pages:{},smallPages:{}};
 const count=pieceChunk(Math.max(1,Math.ceil(Math.max(meta.total,meta.smallTotal)/PAGE_SIZE)))+1;
 for(let chunk=0;chunk<count;chunk++){
  const value=(await query(key(g.manifest.version,`piece-${id}-chunk${chunk}`),'payload',25000))?.payload;
  if(!value||value.encoding!=='gzip-base64')throw new Error('Missing published record pages');
  for(const kind of ['pages','smallPages'] as const)for(const [page,encoded] of Object.entries(value[kind]||{}))pages[kind][page.replace(/^p/,'')]=typeof encoded==='string'?JSON.parse((await gunzipAsync(Buffer.from(encoded,'base64'))).toString()):encoded as RecordRow[];
 }
 if(Object.values(pages.pages).flat().length!==meta.total||Object.values(pages.smallPages).flat().length!==meta.smallTotal)throw new Error('Incomplete published classification');
 return pages;
}

/** Publication worker only: reuse unchanged circuit statistics, never cross generations. */
export async function preparedCompilationBaseline(tours:readonly ('atp'|'wta')[]){
 const g=await preparedGeneration(),baseline:import('./incremental-compilation').CompilationBaseline={};
 for(const tour of tours){
  const meta=tour==='wta'?g.manifest.circuitPieces?.wta:g.manifest.pieces;
  if(!meta)continue;
  const pieces:Record<string,RecordPages>={};
  for(const item of meta){if(item.id==='tal-dia-como-hoy')continue;const id=(tour==='wta'?'wta-':'')+item.id;pieces[id]=await preparedRecordPages(g,id,item);}
  baseline[tour]={meta,pieces};
 }
 if(tours.includes('atp'))baseline.eras=g.source==='remote'?await cloudBlob<Record<string,Era[]>>(g.manifest.version,'eras'):await local<Record<string,Era[]>>('eras');
 return baseline;
}
