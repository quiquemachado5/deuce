import 'server-only';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {cache} from 'react';
import {cloudClient} from '../cloud-archive';
import {asyncCache} from '../async-cache';
import type {Match} from '../types';
import type {PlayerRecord} from '../season-analytics';
import {recordCatalog,eraComparisons,type Era,type RecordRow} from './records';
import {clampPage,pageBoundaryTies,pieceChunk,PAGE_SIZE,SNAPSHOT_SCHEMA,RULES_VERSION,type RecordManifest,type RecordMeta,type RecordPages} from './snapshot';
const bundled=asyncCache<unknown>(3600_000,100);
async function local<T>(id:string):Promise<T>{return await bundled(id,async()=>JSON.parse(gunzipSync(await readFile(join(process.cwd(),'data','reading',`${id}.json.gz`))).toString())) as T;}
const remote=asyncCache<any>(300_000,32);
async function query(key:string,projection='payload',budget=800):Promise<any>{
 return remote(`${key}:${projection}`,async()=>{
  const db=cloudClient();if(!db)return null;
  try{const {data,error}=await db.from('deuce_archive_objects').select(projection).eq('key',key).abortSignal(AbortSignal.timeout(budget)).maybeSingle();return error?null:data;}catch{return null;}
 });
}
async function manifest(){
 const base=await local<RecordManifest>('manifest'),fresh=(await query('reading-v2-manifest'))?.payload as RecordManifest|undefined;
 if(base.schema!==SNAPSHOT_SCHEMA||base.rulesVersion!==RULES_VERSION)throw new Error('Reading snapshot is incompatible; run npm run build');
 return {base,current:fresh?.schema===SNAPSHOT_SCHEMA&&fresh.rulesVersion===RULES_VERSION&&fresh.generatedAt>base.generatedAt?fresh:base};
}
/** Lightweight overview: never re-imports the raw historical archive. */
export const preparedManifest=cache(async()=> (await manifest()).current);
export type RecordView={manifest:RecordManifest;piece?:RecordMeta;rows:RecordRow[];smallRows:RecordRow[];page:number;smallPage:number;eras:Era[];eraTotal:number;filtered:boolean;exists:boolean;emptyReason?:'ranking'};
function initial(m:RecordManifest):RecordView{return {manifest:m,rows:[],smallRows:[],page:1,smallPage:1,eras:[],eraTotal:0,filtered:false,exists:true};}
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
 const deadline=Date.now()+6000,remaining=()=>Math.max(1,deadline-Date.now());
 const row=await query(key(version,id),'payload',remaining());
 if(!row?.payload||Date.now()>=deadline)return undefined;
 return decodeCloudBlob<T>(row.payload,async index=>(await query(key(version,`${id}-chunk${index}`),'payload',remaining()))?.payload,remaining());
}
/** Request path only reads prepared data. No archive ingestion or tape analysis for unfiltered lists. */
export const recordView=cache(async(encoded:string):Promise<RecordView>=>{
 const q:Record<string,string|undefined>=JSON.parse(encoded),{base,current}=await manifest();
 let m=current;
 const filtered=!!([q.year,q.surface,q.competition].some(v=>v&&v!=='all'));
 if(!q.dato)return initial(m);
 if(filtered){
   let matches:Match[]|undefined;
   if(m.version!==base.version)matches=await cloudBlob<Match[]>(m.version,'matches');
   if(!matches){m=base;matches=await local<Match[]>('matches');}
   const selected=matches.filter(x=>(!q.year||q.year==='all'||x.year===Number(q.year))&&(!q.surface||q.surface==='all'||x.surface===q.surface)&&(!q.competition||q.competition==='all'||x.category===q.competition));
   const catalog=recordCatalog(selected),piece=catalog.find(p=>p.id===q.dato),view={...initial(m),filtered:true,exists:m.pieces.some(p=>p.id===q.dato)};
   if(q.dato==='dos-epocas'){const rows=eraComparisons(selected,Number(q.corte)||2020);view.eraTotal=rows.length;view.page=clampPage(q.page,rows.length);view.eras=rows.slice((view.page-1)*PAGE_SIZE,view.page*PAGE_SIZE);return view;}
   if(!piece)return {...view,...(['top-10','top-5','numero-uno'].includes(q.dato)&&selected.length>0&&!selected.some(x=>x.context?.rank1||x.context?.rank2)?{emptyReason:'ranking' as const}:{})};
   const big=piece.rows.filter(r=>!piece.percent||r.sample>=50),small=piece.percent?piece.rows.filter(r=>r.sample<50):[];
   view.piece={...piece,total:big.length,smallTotal:small.length,leader:big[0],pagePrior:pageBoundaryTies(big),smallPagePrior:pageBoundaryTies(small)};view.page=clampPage(q.page,big.length);view.smallPage=clampPage(q.smallPage,small.length);view.rows=big.slice((view.page-1)*PAGE_SIZE,view.page*PAGE_SIZE);view.smallRows=small.slice((view.smallPage-1)*PAGE_SIZE,view.smallPage*PAGE_SIZE);return view;
 }
 if(q.dato==='dos-epocas'){
   let eras:Record<string,Era[]>|undefined;
   if(m.version!==base.version)eras=await cloudBlob<Record<string,Era[]>>(m.version,'eras');
   if(!eras){m=base;eras=await local<Record<string,Era[]>>('eras');}
   const cut=m.eraCuts.includes(Number(q.corte))?String(q.corte):'2020',rows=eras[cut]||[],page=clampPage(q.page,rows.length);
   return {...initial(m),eras:rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE),eraTotal:rows.length,page};
 }
 let meta=m.pieces.find(p=>p.id===q.dato);
 if(!meta)return {...initial(m),exists:false};
 let page=clampPage(q.page,meta.total),smallPage=clampPage(q.smallPage,meta.smallTotal),rows:RecordRow[]|undefined,smallRows:RecordRow[]|undefined;
 if(m.version!==base.version){
   const mainChunk=pieceChunk(page),smallChunk=pieceChunk(smallPage);
   const [main,small]=mainChunk===smallChunk
     ? await query(key(m.version,`piece-${meta.id}-chunk${mainChunk}`),`main:payload->pages->p${page},small:payload->smallPages->p${smallPage}`,1200).then(row=>[row,row])
     : await Promise.all([query(key(m.version,`piece-${meta.id}-chunk${mainChunk}`),`main:payload->pages->p${page}`,1200),query(key(m.version,`piece-${meta.id}-chunk${smallChunk}`),`small:payload->smallPages->p${smallPage}`,1200)]);
   if(main&&small&&(meta.total===0||typeof main.main==='string'||Array.isArray(main.main))&&(meta.smallTotal===0||typeof small.small==='string'||Array.isArray(small.small))){
     try{
       const decode=(page:RecordRow[]|string|null)=>typeof page==='string'?JSON.parse(gunzipSync(Buffer.from(page,'base64')).toString()):page||[];
       rows=decode(main.main);smallRows=decode(small.small);
     }catch{rows=undefined;smallRows=undefined;}
   }
 }
 if(!rows){
   m=base;meta=m.pieces.find(p=>p.id===q.dato);if(!meta)return {...initial(m),exists:false};
   page=clampPage(q.page,meta.total);smallPage=clampPage(q.smallPage,meta.smallTotal);
   const piece=await local<RecordPages>(`piece-${meta.id}`);rows=piece.pages[String(page)]||[];smallRows=piece.smallPages[String(smallPage)]||[];
 }
 return {...initial(m),piece:meta,page,smallPage,rows,smallRows:smallRows||[]};
});

/** Same validated snapshot as Records; never opens the raw provider archive on navigation. */
export const preparedArchive = cache(async (): Promise<Match[]> => {
 const {base,current}=await manifest();
 if(current.version!==base.version){
  const matches=await cloudBlob<Match[]>(current.version,'matches');
  if(matches)return matches;
 }
 return local<Match[]>('matches');
});

/** Matches and player aggregates always come from the same published generation. */
export const preparedPlayerArchive = cache(async (): Promise<{matches:Match[];records:PlayerRecord[]}> => {
 const {base,current}=await manifest();
 if(current.version!==base.version){
  const [matches,records]=await Promise.all([cloudBlob<Match[]>(current.version,'matches'),cloudBlob<PlayerRecord[]>(current.version,'players')]);
  if(matches&&records)return {matches,records};
 }
 const [matches,records]=await Promise.all([local<Match[]>('matches'),local<PlayerRecord[]>('players')]);
 return {matches,records};
});
