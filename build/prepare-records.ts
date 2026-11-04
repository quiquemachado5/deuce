import { assertSnapshotIntegrity, attachRecordChanges } from '../lib/revista/record-changes';
import {loadEnvConfig} from '@next/env';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {assertPublishableArchive} from '../lib/dataset-summary';
import {assertEditionCoverage,assertReleaseCoverage} from '../lib/revista/release-check';
import type {EditionAudit} from '../lib/edition-audit';
import type {Match} from '../lib/types';
import {RULES_VERSION,type RecordManifest} from '../lib/revista/snapshot';
import {preservePublishedArchive} from '../lib/revista/release-source';
import {publishedMatches} from '../lib/publication-scope';
loadEnvConfig(process.cwd());
const isCiBuild=process.env.CI==='1'||process.env.CI==='true';
const verifiesRemoteRelease=process.env.DEUCE_VERIFY_REMOTE_RELEASE==='true'&&!isCiBuild;
async function main(){
  const [{editorialArchive},{compileRecordSnapshot,attachIngestionHistory},{writeBundledSnapshot}]=await Promise.all([import('../lib/editorial-data'),import('../lib/revista/snapshot'),import('../lib/revista/publish-snapshot')]);
  let matches=await editorialArchive();
  let previous:RecordManifest|undefined;
  let previousAudit:EditionAudit[]|undefined;
  let previousCompetition:Match[]|undefined;
  let restoredPublishedArchive=false;
  if(verifiesRemoteRelease){
    const {cloudArchiveConfigured,cloudRead,cloudSnapshotBlob}=await import('../lib/cloud-archive');
    if(!cloudArchiveConfigured())throw new Error('Production release requires the configured remote archive');
    previous=await cloudRead('reading-v2-manifest') as RecordManifest|undefined;
    if(!previous)throw new Error('Cannot verify the published archive baseline');
    const localCount=matches.length;
    matches=await preservePublishedArchive(matches,previous,async version=>{
      if(!previous?.matchPartitions?.length)return cloudSnapshotBlob<Match[]>(version,'matches');
      const groups=await Promise.all(previous.matchPartitions.map(async partition=>({
        partition,
        rows:await cloudSnapshotBlob<Match[]>(version,partition.id),
      })));
      if(groups.some(group=>!group.rows||group.rows.length!==group.partition.count))return undefined;
      return groups.flatMap(group=>group.rows!);
    });
    restoredPublishedArchive=true;
    if(restoredPublishedArchive)console.log(`Published archive preserved: restored ${matches.length} matches over ${localCount} bundled matches`);
    previousAudit=previous.rulesVersion===RULES_VERSION&&typeof previous.version==='string' ? await cloudSnapshotBlob<EditionAudit[]>(previous.version,'audit') : undefined;
    previousCompetition=restoredPublishedArchive&&typeof previous.version==='string' ? await cloudSnapshotBlob<Match[]>(previous.version,'competition') : undefined;
    if(restoredPublishedArchive&&previous.rulesVersion===RULES_VERSION&&previous.editionCount&&previousAudit?.length!==previous.editionCount)throw new Error('Cannot restore the published edition audit');
    if(restoredPublishedArchive&&previous.rulesVersion===RULES_VERSION&&previous.competitionCount&&previousCompetition?.length!==previous.competitionCount)throw new Error('Cannot restore the published competition archive');
  }
  matches=publishedMatches(matches);
  let bundledPrevious:RecordManifest|undefined;
  try{bundledPrevious=JSON.parse(gunzipSync(await readFile('data/reading/manifest.json.gz')).toString()) as RecordManifest;}catch{}
  const comparablePreviousCount=previous?.rulesVersion===RULES_VERSION?previous.matchCount:bundledPrevious?.rulesVersion===RULES_VERSION?bundledPrevious.matchCount:0;
  assertPublishableArchive(matches,comparablePreviousCount);
  const {competitionEntries,editionSourceAudit}=await import('../lib/live-tennis');
  const canReuseDerived=restoredPublishedArchive&&previous?.rulesVersion===RULES_VERSION;
  const competition=canReuseDerived ? previousCompetition||[] : await competitionEntries();
  const audit=canReuseDerived ? previousAudit||[] : await editionSourceAudit();
  const snapshot=compileRecordSnapshot(matches,new Date(),competition,audit);
  if(verifiesRemoteRelease){
    if(!previous)throw new Error('Cannot verify the published archive baseline');
    assertReleaseCoverage(previous,snapshot.manifest);
    if(previous.rulesVersion===RULES_VERSION&&previousAudit?.length)assertEditionCoverage(previousAudit,snapshot.audit);
    else console.log('Edition coverage baseline initialized from this release');
    snapshot.manifest=attachIngestionHistory(previous,attachRecordChanges(previous,snapshot.manifest));
    console.log(`Release baseline verified: ${previous.matchCount} published matches; ${snapshot.manifest.matchCount} prepared; measured coverage preserved`);
  }
  assertSnapshotIntegrity(snapshot);
  await writeBundledSnapshot(snapshot);
  // Builds must only prepare their immutable local generation. Uploading the
  // full archive to Supabase here can exceed the deployment build budget; the
  // daily refresh publishes later, with its pointer committed last.
  console.log(`Reading snapshot: ${snapshot.manifest.matchCount} matches, ${snapshot.manifest.pieces.length} lists, version ${snapshot.manifest.version}`);
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Snapshot failed');process.exitCode=1});
