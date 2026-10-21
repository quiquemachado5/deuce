import {loadEnvConfig} from '@next/env';
loadEnvConfig(process.cwd());
async function main(){
  const [{editorialArchive},{compileRecordSnapshot},{writeBundledSnapshot}]=await Promise.all([import('../lib/editorial-data'),import('../lib/revista/snapshot'),import('../lib/revista/publish-snapshot')]);
  const snapshot=compileRecordSnapshot(await editorialArchive());
  if(snapshot.matches.length<1)throw new Error('Cannot publish an empty reading snapshot');
  await writeBundledSnapshot(snapshot);
  // Builds must only prepare their immutable local generation. Uploading the
  // full archive to Supabase here can exceed the deployment build budget; the
  // daily refresh publishes later, with its pointer committed last.
  console.log(`Reading snapshot: ${snapshot.manifest.matchCount} matches, ${snapshot.manifest.pieces.length} lists, version ${snapshot.manifest.version}`);
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Snapshot failed');process.exitCode=1});
