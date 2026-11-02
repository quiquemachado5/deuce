import 'server-only';
import {packArtifacts} from './artifact-packs';
import { attachRecordChanges, assertSnapshotIntegrity } from './record-changes';
import {gzipSync,createGzip} from 'node:zlib';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {mkdir,writeFile,rename,readdir,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {cloudPruneSnapshotGenerations,cloudRead,cloudWrite,cloudWriteMany,type ArchiveWrite} from '../cloud-archive';
import {attachIngestionHistory,partitionMatches,pieceChunk,type Snapshot,type RecordPages,type RecordManifest} from './snapshot';
import {assertPublishableArchive} from '../dataset-summary';
import {compileMatchBrowser,matchBrowserArtifact} from '../match-browser-snapshot';
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
  const browser=compileMatchBrowser(snapshot.matches);
  const artifacts:Record<string,unknown>={eras:snapshot.eras,matches:snapshot.matches,players:snapshot.players,competition:snapshot.competition,audit:snapshot.audit,'browser-index':browser.index,...Object.fromEntries(browser.partitions.map(partition=>[matchBrowserArtifact(partition.id),partition])),...Object.fromEntries(Object.entries(snapshot.pieces).map(([id,p])=>[`piece-${id}`,p])),manifest:snapshot.manifest};
  for(const [id,value] of Object.entries(artifacts)) {
    const path=join(dir,`${id}.json.gz`);await writeFile(`${path}.tmp`,gzipSync(JSON.stringify(value)));await rename(`${path}.tmp`,path);
  }
  const expected=new Set(Object.keys(artifacts).map(id=>`${id}.json.gz`));
  for(const file of await readdir(dir))if(file.endsWith('.json.gz')&&!expected.has(file))await unlink(join(dir,file));
}
type SnapshotStorage={read:(key:string)=>Promise<unknown>;write:(key:string,payload:unknown)=>Promise<void>;writeMany?:(entries:readonly ArchiveWrite[])=>Promise<void>;prune?:(keepVersions:readonly string[])=>Promise<number>};
function publishedGeneration(manifest:RecordManifest) {
  // Compare the stored JSON representation, which omits optional undefined fields.
  const generation=JSON.parse(JSON.stringify(manifest));
  delete generation.generatedAt;
  delete generation.artifactPacks;
  return generation;
}
/** A published pointer proves all artifacts exist. A new pointer is written last. */
export async function publishRecordSnapshot(snapshot:Snapshot,storage:SnapshotStorage={read:cloudRead,write:cloudWrite,writeMany:cloudWriteMany,prune:cloudPruneSnapshotGenerations}) {
  assertSnapshotIntegrity(snapshot);
  const {pieces,eras,matches,players,competition,audit}=snapshot;
  const published=await storage.read('reading-v2-manifest');
  if((published as RecordManifest|undefined)?.version===snapshot.manifest.version&&(published as RecordManifest).artifactPacks)return published as RecordManifest;
  const previousCount=(published as RecordManifest|undefined)?.rulesVersion===snapshot.manifest.rulesVersion
    ? (published as RecordManifest).matchCount : 0;
  assertPublishableArchive(matches,previousCount);
  const manifest=attachIngestionHistory(published as RecordManifest | undefined,attachRecordChanges(published as RecordManifest | undefined,snapshot.manifest));
  if((published as RecordManifest|undefined)?.artifactPacks&&published&&typeof published==='object'&&isDeepStrictEqual(publishedGeneration(published as RecordManifest),publishedGeneration(manifest))){
    if(Date.parse(manifest.generatedAt)>Date.parse((published as RecordManifest).generatedAt))await storage.write('reading-v2-manifest',{...manifest,artifactPacks:(published as RecordManifest).artifactPacks});
    return manifest;
  }
  if(storage.prune&&published&&typeof published==='object'&&typeof (published as RecordManifest).version==='string'){
    await storage.prune([(published as RecordManifest).version]).catch(error=>console.warn('Snapshot retention preflight failed:',error instanceof Error?error.name:'unknown'));
  }
  async function* artifacts():AsyncGenerator<[string,unknown]> {
    const browser=compileMatchBrowser(matches);
    for(const [id,piece] of Object.entries(pieces))yield* compressedPages(id,piece);
    for(const group of partitionMatches(matches))yield* await compressedBlob(group.meta.id,group.matches);
    for(const partition of browser.partitions)yield* await compressedBlob(matchBrowserArtifact(partition.id),partition);
    for(const [id,value] of [['browser-index',browser.index],['eras',eras],['players',players],['competition',competition],['audit',audit]] as const)yield* await compressedBlob(id,value);
  }
  const artifactPacks: Record<string,string> = {};
  let uploads = 0;
  for await (const pack of packArtifacts(artifacts())) {
    // A hard publication budget leaves room for daily ingestion in Hobby.
    if (++uploads > 24) throw new Error('Publication exceeds the free-plan upload budget');
    await storage.write(snapshotKey(manifest.version,pack.id),pack.payload);
    for (const id of Object.keys(pack.payload.artifacts)) artifactPacks[id] = pack.id;
  }
  manifest.artifactPacks = artifactPacks;
  await storage.write('reading-v2-manifest',manifest);
  if(storage.prune){
    const previous=published&&typeof published==='object'?(published as RecordManifest).version:undefined;
    await storage.prune([manifest.version,...(previous?[previous]:[])]).catch(error=>console.warn('Snapshot retention cleanup failed:',error instanceof Error?error.name:'unknown'));
  }
  return manifest;
}
