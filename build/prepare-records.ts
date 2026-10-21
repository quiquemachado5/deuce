import {loadEnvConfig} from '@next/env';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {assertPublishableArchive} from '../lib/dataset-summary';
loadEnvConfig(process.cwd());
async function main(){
  const [{editorialArchive},{compileRecordSnapshot},{writeBundledSnapshot}]=await Promise.all([import('../lib/editorial-data'),import('../lib/revista/snapshot'),import('../lib/revista/publish-snapshot')]);
  const matches=await editorialArchive();
  let previousCount=0;
  try{previousCount=JSON.parse(gunzipSync(await readFile('data/reading/manifest.json.gz')).toString()).matchCount||0;}catch{}
  assertPublishableArchive(matches,previousCount);
  const snapshot=compileRecordSnapshot(matches);
  await writeBundledSnapshot(snapshot);
  // Builds must only prepare their immutable local generation. Uploading the
  // full archive to Supabase here can exceed the deployment build budget; the
  // daily refresh publishes later, with its pointer committed last.
  console.log(`Reading snapshot: ${snapshot.manifest.matchCount} matches, ${snapshot.manifest.pieces.length} lists, version ${snapshot.manifest.version}`);
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Snapshot failed');process.exitCode=1});
