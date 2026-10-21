import 'server-only';
import {gzipSync} from 'node:zlib';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {cloudRead,cloudWrite,cloudWriteMany,type ArchiveWrite} from '../cloud-archive';
import {pieceChunk,type Snapshot,type RecordPages,type RecordManifest} from './snapshot';
function compressedPages(id:string,piece:RecordPages):Array<[string,unknown]> {
 const chunks=new Map<number,{encoding:string;pages:Record<string,string>;smallPages:Record<string,string>}>([[0,{encoding:'gzip-base64',pages:{},smallPages:{}}]]);
 for(const group of ['pages','smallPages'] as const)for(const [page,rows] of Object.entries(piece[group])){
   const index=pieceChunk(Number(page)),chunk=chunks.get(index)||{encoding:'gzip-base64',pages:{},smallPages:{}};
   chunk[group][`p${page}`]=gzipSync(JSON.stringify(rows)).toString('base64');chunks.set(index,chunk);
 }
 return [...chunks].map(([index,payload])=>[`piece-${id}-chunk${index}`,payload]);
}
function compressedBlob(id:string,value:unknown):Array<[string,unknown]> {
 const encoded=gzipSync(JSON.stringify(value)).toString('base64');
 if(encoded.length<=500_000)return [[id,{gzip:encoded}]];
 const parts:Array<[string,unknown]>=[];
 for(let offset=0;offset<encoded.length;offset+=500_000)parts.push([`${id}-chunk${parts.length}`,{chunk:encoded.slice(offset,offset+500_000)}]);
 return [...parts,[id,{encoding:'gzip-chunks',chunks:parts.length}]];
}
export const snapshotKey=(version:string,id:string)=>`reading-v2-${version}-${id}`;
export async function writeBundledSnapshot(snapshot:Snapshot) {
  const dir=join(process.cwd(),'data','reading');await mkdir(dir,{recursive:true});
  const artifacts:Record<string,unknown>={manifest:snapshot.manifest,eras:snapshot.eras,matches:snapshot.matches,players:snapshot.players,...Object.fromEntries(Object.entries(snapshot.pieces).map(([id,p])=>[`piece-${id}`,p]))};
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
  const {manifest,pieces,eras,matches,players}=snapshot;
  const published=await storage.read('reading-v2-manifest');
  if(published&&typeof published==='object'&&isDeepStrictEqual(publishedGeneration(published as RecordManifest),publishedGeneration(manifest)))return;
  const artifacts:Array<[string,unknown]>=[...Object.entries(pieces).flatMap(([id,p])=>compressedPages(id,p)),...compressedBlob('eras',eras),...compressedBlob('matches',matches),...compressedBlob('players',players)];
  const batches:ArchiveWrite[][]=[];
  let batch:ArchiveWrite[]=[],bytes=2;
  for(const [id,payload] of artifacts){
    const entry={key:snapshotKey(manifest.version,id),payload},size=Buffer.byteLength(JSON.stringify({...entry,updated_at:'0000-00-00T00:00:00.000Z'}));
    if(batch.length&&(batch.length===8||bytes+size+1>1_000_000)){batches.push(batch);batch=[];bytes=2;}
    bytes+=size+(batch.length?1:0);batch.push(entry);
  }
  if(batch.length)batches.push(batch);
  // Versioned artifact keys make a failed upload safe to retry. Run a small
  // number of independent batches together so a large archive stays within
  // the cron budget, but never expose the new manifest until all settle.
  const concurrency=4;
  for(let index=0;index<batches.length;index+=concurrency){
    const settled=await Promise.allSettled(batches.slice(index,index+concurrency).map(async entries=>{
      if(storage.writeMany)await storage.writeMany(entries);
      else for(const {key,payload} of entries)await storage.write(key,payload);
    }));
    const failed=settled.find(result=>result.status==='rejected');
    if(failed?.status==='rejected')throw failed.reason;
  }
  await storage.write('reading-v2-manifest',manifest);
}
