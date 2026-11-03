import 'server-only';
import {registerArtifactPacks,readSnapshotArtifact,clearArtifactPacks} from './artifact-packs';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {cache} from 'react';
import {cloudArchiveConfigured,cloudProbeRead} from '../cloud-archive';
import {asyncCache} from '../async-cache';
import type {Match} from '../types';
import type {PlayerRecord} from '../season-analytics';
import {eraComparisons,type Era,type RecordRow} from './records';
import {clampPage,pageBoundaryTies,pieceChunk,PAGE_SIZE,SNAPSHOT_SCHEMA,RULES_VERSION,type MatchPartition,type RecordManifest,type RecordMeta,type RecordPages} from './snapshot';
import {assertGenerationCoherence,compatibleManifest,selectGeneration,type PreparedGeneration,type GenerationStatus,type GenerationSourceDecision,type FallbackReason} from './generation';
import {selectedArchive, selectedCatalog} from './selection';
import {auditEditions} from '../edition-audit';
import {readingDirectory} from '../reading-directory';
import {mergeTournamentEditionDetails} from '../tournament-edition-data';
import {circuitMatchContext} from '../match-context';
import {browserPartitionMatchesDetails,decodeMatchBrowserRow,MATCH_BROWSER_DICTIONARIES,MATCH_BROWSER_ROW_LENGTH,MATCH_BROWSER_SCHEMA,matchBrowserArtifact,type MatchBrowserIndex,type MatchBrowserPartition} from '../match-browser-snapshot';
import {reconcileCoverage,type CoverageReconciliation} from '../coverage-reconciliation';
import historyBaseline from '../../ops/wta-history-baseline.json';
const IMMUTABLE_CACHE_MS = 86_400_000;
const bundled=asyncCache<unknown>(IMMUTABLE_CACHE_MS,48);
const uncachedBundledPrefixes=['matches-','browser-'] as const;
const uncachedBundledIds=new Set(['matches','competition','players','audit','reconciliation']);
export function shouldCacheBundledArtifact(id:string) {
 return !uncachedBundledIds.has(id)&&!uncachedBundledPrefixes.some(prefix=>id.startsWith(prefix));
}
async function readLocal<T>(id:string):Promise<T>{return JSON.parse(gunzipSync(await readFile(join(readingDirectory(),`${id}.json.gz`))).toString()) as T;}
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
async function selectedSnapshotSource(){return snapshotSources('active',async()=>{
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
});}

function rejectRemoteSnapshot(){
 manifestCircuit.failed();
 snapshotSources.clear();
 generations.clear();
 remotePointers.clear();
 remoteArtifacts.clear();
 browserIndexes.clear();
 browserPartitions.clear();
 clearArtifactPacks();
}

export const preparedGeneration=cache(()=>generations('active',async()=>{
 const base=await preparedBundledManifest();
 const decision=await selectedSnapshotSource();
 const bundledGeneration:PreparedGeneration={manifest:base,source:'bundled',matches:()=>loadPartitionedArchive({manifest:base,source:'bundled'}),records:()=>local<PlayerRecord[]>('players'),competition:()=>localOptional<Match[]>('competition',[])};
 if(decision.source==='bundled')return {...bundledGeneration,fallbackReason:decision.fallbackReason};
 const generation=await selectGeneration(bundledGeneration,decision.manifest,
   async m=>{const [matches,records,competition]=await Promise.all([cloudMatches(m),cloudBlob<PlayerRecord[]>(m.version,'players'),cloudBlob<Match[]>(m.version,'competition')]);return {matches,records,competition};},true);
 try{return assertGenerationCoherence(decision,generation);}
 catch(error){rejectRemoteSnapshot();throw error;}
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
 const keys=Array.from({length:Number(index.chunks)},(_,i)=>key(version,`${id}-chunk${i}`));
 const groups=Array.from({length:Math.ceil(keys.length/8)},(_,i)=>keys.slice(i*8,i*8+8));
 try{
  const rows=await Promise.all(groups.map(async group=>{
   const data=await Promise.all(group.map(async partKey=>({key:partKey,payload:await readSnapshotArtifact(partKey,physical=>cloudProbeRead(physical,remaining()))})));
   if(data.some(row=>row.payload===undefined))throw new Error('Incomplete snapshot blob');
   return data;
  }));
  const parts=new Map(rows.flat().map(part=>[part.key,part.payload]));
  const decoded=await decodeCloudBlob<T>(row.payload,async part=>parts.get(keys[part]),remaining());
  if(decoded===undefined)console.warn('Snapshot blob decode failed:',id);
  return decoded;
 }catch(error){console.warn('Snapshot blob read failed:',id,error instanceof Error?error.message:'unknown');return undefined;}
}
async function cloudMatches(manifest:RecordManifest):Promise<Match[]|undefined>{
 if(!manifest.matchPartitions?.length)return cloudBlob<Match[]>(manifest.version,'matches');
 const partitions=await Promise.all(manifest.matchPartitions.map(async part=>({part,rows:await cloudBlob<Match[]>(manifest.version,part.id)})));
 if(partitions.some(({part,rows})=>!fullPartitionMatchesManifest(rows,part)))return undefined;
 return partitions.flatMap(({rows})=>rows!);
}
/** Request path only reads prepared data. No archive ingestion or tape analysis for unfiltered lists. */
export const recordView=cache(async(encoded:string,recomputed=false):Promise<RecordView>=>{
 const q:Record<string,string|undefined>={tour:'atp',...JSON.parse(encoded)},g=await preparedGeneration(),base=g.manifest,m=q.tour==='wta'&&base.circuitPieces?{...base,pieces:base.circuitPieces.wta}:base;
 // A circuit filter matching the entire published snapshot needs no catalogue
 // recomputation. This keeps the ATP landing page fast while WTA is backfilled.
 const tourFiltered=(q.tour==='atp'||q.tour==='wta')
   ? q.tour==='wta'&&(!base.circuitPieces||q.dato==='dos-epocas')
   : !!(q.tour&&q.tour!=='all');
 const filtered=tourFiltered||!!([q.year,q.surface,q.competition,q.era].some(v=>v&&v!=='all'));
 if(!q.dato){
   if(!filtered)return {...initial(g),manifest:m};
   const selected=await selectedArchive(g,q),catalog=await selectedCatalog(g,q);
   const pieces=catalog.filter(piece=>piece.rows.length>0).map(piece=>{const big=piece.rows.filter(r=>!piece.percent||r.sample>=50),small=piece.percent?piece.rows.filter(r=>r.sample<50):[];const {rows:_,...meta}=piece;void _;return {...meta,total:big.length,smallTotal:small.length,leader:big[0],pagePrior:pageBoundaryTies(big),smallPagePrior:pageBoundaryTies(small)};});
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
     ? await query(key(m.version,`piece-${q.tour==='wta'?'wta-':''}${meta.id}-chunk${mainChunk}`),`main:payload->pages->p${page},small:payload->smallPages->p${smallPage}`,1200).then(row=>[row,row])
     : await Promise.all([query(key(m.version,`piece-${q.tour==='wta'?'wta-':''}${meta.id}-chunk${mainChunk}`),`main:payload->pages->p${page}`,1200),query(key(m.version,`piece-${q.tour==='wta'?'wta-':''}${meta.id}-chunk${smallChunk}`),`small:payload->smallPages->p${smallPage}`,1200)]);
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
const fullPartitions=asyncCache<Match[]>(IMMUTABLE_CACHE_MS,8,undefined,{maxWeight:96*megabyte,weight:value=>value.length*8_000});
const matchDetails=asyncCache<Match|undefined>(IMMUTABLE_CACHE_MS,64);
const compactArchives=asyncCache<Match[]>(IMMUTABLE_CACHE_MS,2,undefined,{maxWeight:40*megabyte,weight:value=>value.length*3_000});
const compactIndexes=asyncCache<Map<string,Match>>(IMMUTABLE_CACHE_MS,1,undefined,{maxWeight:40*megabyte,weight:value=>value.size*3_500});
const competitionArchives=asyncCache<Match[]>(IMMUTABLE_CACHE_MS,2,undefined,{maxWeight:32*megabyte,weight:value=>value.length*1_200});
const playerRecords=asyncCache<PlayerRecord[]>(IMMUTABLE_CACHE_MS,2,undefined,{maxWeight:16*megabyte,weight:value=>value.length*320});
const coverageReconciliations=asyncCache<CoverageReconciliation>(IMMUTABLE_CACHE_MS,2,undefined,{maxWeight:8*megabyte,weight:value=>value.issues.length*520});
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
 const decision=await selectedSnapshotSource();
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
async function compactArchiveIndex(browser:Awaited<ReturnType<typeof preparedMatchBrowser>>) {
 const matches=await compactArchive(browser,'all');
 return compactIndexes(`${browser.manifest.version}:${browser.source}`,async()=>new Map(matches.map(match=>[match.match_id,match])));
}
export const preparedCompactArchive=cache(async(tour:'atp'|'wta'|'all'='all')=>compactArchive(await preparedMatchBrowser(tour),tour));

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
 const source=await selectedSnapshotSource();
 return {records:await selectedPlayerRecords(source),manifest:source.manifest,source:source.source,fallbackReason:source.fallbackReason};
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

/** Only the requested circuit's full-detail partitions are inflated. */
export const preparedTourArchive=cache(async(tour:'atp'|'wta'):Promise<Match[]>=>{
 return loadPartitionedArchive(await selectedSnapshotSource(),tour);
});

/** Detail readers never allocate the relationship array used by the page. */
export const preparedMatchDetail=cache(async(id:string)=>{
 const browser=await preparedMatchBrowser('all');
 return matchDetails(`${browser.manifest.version}:${browser.source}:${id}`,async()=>{
  const summary=(await compactArchiveIndex(browser)).get(id);
  if(!summary)return (await selectedCompetition(browser)).find(candidate=>candidate.match_id===id);
  const meta=browser.manifest.matchPartitions?.find(partition=>partition.tour===(summary.tour||'atp')&&summary.year>=partition.fromYear&&summary.year<=partition.toYear);
  if(!meta)throw new Error(`Missing detail partition for ${id}`);
  const match=(await loadFullPartition(browser,meta)).find(candidate=>candidate.match_id===id);
  if(!match)throw new Error(`Match ${id} is absent from ${meta.id}`);
  return match;
 });
});

export const preparedMatch=preparedMatchDetail;

export const preparedMatchContext=cache(async(id:string)=>{
 const [match,browser]=await Promise.all([preparedMatchDetail(id),preparedMatchBrowser('all')]);
 if(!match)return {match,matches:[] as Match[]};
 const summaries=await compactArchive(browser,'all');
 return {match,matches:circuitMatchContext(summaries,match)};
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
 const browser=await preparedMatchBrowser('all'),source=browser;
 const metas=(source.manifest.matchPartitions||[]).filter(partition=>year>=partition.fromYear&&year<=partition.toYear&&(tour==='all'||partition.tour===tour));
 const details=metas.length?(await Promise.all(metas.map(meta=>loadFullPartition(source,meta)))).flat():[];
 const [summaries,competition]=await Promise.all([compactArchive(browser,'all'),selectedCompetition(source)]);
 return mergeTournamentEditionDetails(summaries,details,competition,year,tour);
});

export const preparedEditionAudit=cache(async()=>{const g=await preparedGeneration();const stored=g.source==='remote' ? await cloudBlob<import('../edition-audit').EditionAudit[]>(g.manifest.version,'audit') : await localOptional<import('../edition-audit').EditionAudit[]>('audit',[]);if(stored?.length)return stored;const [matches,competition]=await Promise.all([g.matches(),g.competition?.()||Promise.resolve([])]);return auditEditions([...matches,...competition]);});

export const preparedCoverageReconciliation=cache(async()=>{
 const generation=await preparedGeneration(),cacheKey=`${generation.manifest.version}:${generation.source}`;
 return coverageReconciliations(cacheKey,async()=>{
  const stored=generation.source==='remote'
   ? await cloudBlob<CoverageReconciliation>(generation.manifest.version,'reconciliation')
   : await localOptional<CoverageReconciliation|undefined>('reconciliation',undefined);
  if(stored?.summary&&Array.isArray(stored.issues))return stored;
  const [matches,audit]=await Promise.all([preparedCompactArchive('all'),preparedEditionAudit()]);
  return reconcileCoverage(matches,audit,historyBaseline.allowedPendingCohorts);
 });
});

export function preparedDataCacheDiagnostics() {
 return Object.fromEntries(Object.entries({bundled,remotePointers,remoteArtifacts,generations,snapshotSources,browserIndexes,browserPartitions,decodedBrowserPartitions,fullPartitions,matchDetails,compactArchives,compactIndexes,competitionArchives,playerRecords,coverageReconciliations})
  .map(([name,cache])=>[name,cache.stats()]));
}

export function invalidatePreparedGeneration() { generations.clear(); snapshotSources.clear(); browserIndexes.clear(); browserPartitions.clear(); decodedBrowserPartitions.clear(); fullPartitions.clear(); matchDetails.clear(); compactArchives.clear(); compactIndexes.clear(); competitionArchives.clear(); playerRecords.clear(); coverageReconciliations.clear(); remotePointers.clear(); remoteArtifacts.clear(); clearArtifactPacks(); manifestCircuit.succeeded(); }
