import 'server-only';
import {gzipSync,createGzip} from 'node:zlib';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {cloudRead,cloudWrite,cloudWriteMany,type ArchiveWrite} from '../cloud-archive';
import {pieceChunk,type Snapshot,type RecordPages,type RecordManifest} from './snapshot';
import {assertPublishableArchive} from '../dataset-summary';
function compressedPages(id:string,piece:RecordPages):Array<[string,unknown]> {
 const chunks=new Map<number,{encoding:string;pages:Record<string,string>;smallPages:Record<string,string>}>([[0,{encoding:'gzip-base64',pages:{},smallPages:{}}]]);
 for(const group of ['pages','smallPages'] as const)for(const [page,rows] of Object.entries(piece[group])){
   const index=pieceChunk(Number(page)),chunk=chunks.get(index)||{encoding:'gzip-base64',pages:{},smallPages:{}};
   chunk[group][`p${page}`]=gzipSync(JSON.stringify(rows)).toString('base64');chunks.set(index,chunk);
 }
 return [...chunks].map(([index,payload])=>[`piece-${id}-chunk${index}`,payload]);
}
export async function compressedJson(value:unknown):Promise<Buffer> {
 if(!Array.isArray(value))return gzipSync(JSON.stringify(value));
 const rows=value;
 function* json(){yield '[';for(let i=0;i<rows.length;i++){if(i)yield ',';yield JSON.stringify(rows[i]);}yield ']';}
 const chunks:Buffer[]=[];
 await pipeline(Readable.from(json()),createGzip(),async source=>{for await(const chunk of source)chunks.push(Buffer.from(chunk));});
 return Buffer.concat(chunks);
}
async function compressedBlob(id:string,value:unknown):Promise<Array<[string,unknown]>> {
 const encoded=(await compressedJson(value)).toString('base64');
 if(encoded.length<=500_000)return [[id,{gzip:encoded}]];
 const parts:Array<[string,unknown]>=[];
 for(let offset=0;offset<encoded.length;offset+=500_000)parts.push([`${id}-chunk${parts.length}`,{chunk:encoded.slice(offset,offset+500_000)}]);
 return [...parts,[id,{encoding:'gzip-chunks',chunks:parts.length}]];
}
export const snapshotKey=(version:string,id:string)=>`reading-v2-${version}-${id}`;
export async function writeBundledSnapshot(snapshot:Snapshot) {
  const dir=join(process.cwd(),'data','reading');await mkdir(dir,{recursive:true});
  assertPublishableArchive(snapshot.matches);
  const artifacts:Record<string,unknown>={eras:snapshot.eras,matches:snapshot.matches,players:snapshot.players,competition:snapshot.competition,audit:snapshot.audit,...Object.fromEntries(Object.entries(snapshot.pieces).map(([id,p])=>[`piece-${id}`,p])),manifest:snapshot.manifest};
  for(const [id,value] of Object.entries(artifacts)) {
    const path=join(dir,`${id}.json.gz`);await writeFile(`${path}.tmp`,gzipSync(JSON.stringify(value)));await rename(`${path}.tmp`,path);
  }
}
type SnapshotStorage={read:(key:string)=>Promise<unknown>;write:(key:string,payload:unknown)=>Promise<void>;writeMany?:(entries:readonly ArchiveWrite[])=>Promise<void>};
function publishedGeneration(manifest:RecordManifest) {
  // Compare the stored JSON representation, which omits optional undefined fields.
  const generation=JSON.parse(JSON.stringify(manifest));
  delete generation.generatedAt;
  return generation;
}
/** A published pointer proves all artifacts exist. A new pointer is written last. */
export async function publishRecordSnapshot(snapshot:Snapshot,storage:SnapshotStorage={read:cloudRead,write:cloudWrite,writeMany:cloudWriteMany}) {
  const {manifest,pieces,eras,matches,players,competition,audit}=snapshot;
  const published=await storage.read('reading-v2-manifest');
  assertPublishableArchive(matches,(published as RecordManifest|undefined)?.matchCount);
  if(published&&typeof published==='object'&&isDeepStrictEqual(publishedGeneration(published as RecordManifest),publishedGeneration(manifest)))return;
  async function* artifacts():AsyncGenerator<[string,unknown]> {
    for(const [id,piece] of Object.entries(pieces))yield* compressedPages(id,piece);
    for(const [id,value] of [['eras',eras],['matches',matches],['players',players],['competition',competition],['audit',audit]] as const)yield* await compressedBlob(id,value);
  }
  const batches:ArchiveWrite[][]=[];
  const flush=async()=>{
    const settled=await Promise.allSettled(batches.splice(0).map(async entries=>{
      if(storage.writeMany)await storage.writeMany(entries);
      else for(const {key,payload} of entries)await storage.write(key,payload);
    }));
    const failed=settled.find(result=>result.status==='rejected');
    if(failed?.status==='rejected')throw failed.reason;
  };
  let batch:ArchiveWrite[]=[],bytes=2;
  for await(const [id,payload] of artifacts()){
    const entry={key:snapshotKey(manifest.version,id),payload},size=Buffer.byteLength(JSON.stringify({...entry,updated_at:'0000-00-00T00:00:00.000Z'}));
    if(batch.length&&(batch.length===8||bytes+size+1>1_000_000)){batches.push(batch);batch=[];bytes=2;if(batches.length===4)await flush();}
    bytes+=size+(batch.length?1:0);batch.push(entry);
  }
  if(batch.length)batches.push(batch);
  // Versioned artifact keys make a failed upload safe to retry. Run a small
  // number of independent batches together so a large archive stays within
  // the cron budget, but never expose the new manifest until all settle.
  await flush();
  await storage.write('reading-v2-manifest',manifest);
}
