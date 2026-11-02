import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {publishRecordSnapshot} from '../lib/revista/publish-snapshot';
import {clearArtifactPacks,registerArtifactPacks,readSnapshotArtifact,type ArtifactPack} from '../lib/revista/artifact-packs';
import type {Snapshot,RecordManifest,RecordPages} from '../lib/revista/snapshot';
import {readingSource} from './reading-source';

async function main(){
const root=readingSource();
const read=async<T>(id:string):Promise<T>=>JSON.parse(gunzipSync(await readFile(`${root}/${id}.json.gz`)).toString());
const manifest=await read<RecordManifest>('manifest');
const ids=[...manifest.pieces.map(p=>p.id),...(manifest.circuitPieces?.wta||[]).map(p=>`wta-${p.id}`)];
const snapshot:Snapshot={manifest,pieces:Object.fromEntries(await Promise.all(ids.map(async id=>[id,await read<RecordPages>(`piece-${id}`)]))),
  matches:await read('matches'),players:await read('players'),competition:await read('competition'),audit:await read('audit'),eras:await read('eras')};
let uploads=0,bytes=0,logicalArtifacts=0,firstPack:{key:string;payload:ArtifactPack}|undefined;
const writes:string[]=[];
const published=await publishRecordSnapshot(snapshot,{read:async()=>undefined,write:async(key,payload)=>{
  writes.push(key);uploads++;bytes+=Buffer.byteLength(JSON.stringify(payload));
  const pack=payload as ArtifactPack;
  if(pack.artifacts){logicalArtifacts+=Object.keys(pack.artifacts).length;firstPack||={key,payload:pack};}
}});
assert.equal(writes.at(-1),'reading-v2-manifest');assert.ok(uploads<=25);assert.ok(firstPack);
registerArtifactPacks(published.version,published.artifactPacks);
const id=Object.keys(firstPack.payload.artifacts)[0];
assert.deepEqual(await readSnapshotArtifact(`reading-v2-${published.version}-${id}`,async key=>key===firstPack?.key?firstPack.payload:undefined),firstPack.payload.artifacts[id]);
clearArtifactPacks();
const baseline={...published,version:'0'.repeat(20)};
let pointer=baseline;
await assert.rejects(publishRecordSnapshot(snapshot,{read:async()=>baseline,write:async(key,payload)=>{
  if(key==='reading-v2-manifest')pointer=payload as RecordManifest;
  else throw Error('Injected Blob failure');
}}),/Injected Blob failure/);
assert.equal(pointer,baseline,'Failed upload must preserve the active pointer');
let retryWrites=0;
await publishRecordSnapshot(snapshot,{read:async()=>published,write:async()=>{retryWrites++;}});
assert.equal(retryWrites,0,'A completed retry must not upload the generation again');
console.log(JSON.stringify({matches:manifest.matchCount,tours:manifest.summary.tours,logicalArtifacts,uploads,uncompressedPackBytes:bytes,version:published.version,checks:['pointer-last','checksum round trip','failed upload preserves pointer','completed retry writes nothing'],scope:'Local generation and injected storage; no network writes'}));

}
main().catch(error=>{console.error(error);process.exitCode=1;});
