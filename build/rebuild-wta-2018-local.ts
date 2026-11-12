/** Offline local rebuild: preserve the immutable baseline, add the two reviewed draws only. */
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {editionReferenceMatches} from '../lib/verified-editions';
import {prepareMatch,eligibleMatch} from '../lib/quality';
import {isCompetitionOnly,prepareCompetitionMatch} from '../lib/competition';
import {auditEditions,type EditionAudit} from '../lib/edition-audit';
import {compileRecordSnapshot,attachIngestionHistory,type RecordManifest} from '../lib/revista/snapshot';
import {assertSnapshotIntegrity,attachRecordChanges} from '../lib/revista/record-changes';
import {assertReleaseCoverage} from '../lib/revista/release-check';
import {writeBundledSnapshot} from '../lib/revista/publish-snapshot';
import type {Match} from '../lib/types';

async function read<T>(name:string):Promise<T>{return JSON.parse(gunzipSync(await readFile(`data/reading/${name}.json.gz`)).toString());}
async function main(){
 const [previous,baseline,competition,audit]=await Promise.all([read<RecordManifest>('manifest'),read<Match[]>('matches'),read<Match[]>('competition'),read<EditionAudit[]>('audit')]);
 const reviewed=editionReferenceMatches.filter(m=>m.match_id.startsWith('reference-wta-2018-'));
 assert.equal(reviewed.length,254);
 const ids=new Set([...baseline,...competition].map(m=>m.match_id));
 const additions=reviewed.filter(m=>!ids.has(m.match_id));
 const played=additions.map(prepareMatch).filter(eligibleMatch);
 const terminal=additions.filter(isCompetitionOnly).map(prepareCompetitionMatch);
 const newAudit=auditEditions(reviewed);
 assert.ok(newAudit.every(e=>e.completeDraw===true));
 const keys=new Set(newAudit.map(e=>[e.tour,e.year,e.tournament].join('|')));
 // Refuse to merge an independently populated edition silently; use the normal reconciliation workflow instead.
 assert.ok(!baseline.some(m=>keys.has([m.tour,m.year,m.tournament].join('|'))&&!m.match_id.startsWith('reference-wta-2018-')));
 const snapshot=compileRecordSnapshot([...baseline,...played],new Date(),[...competition,...terminal],[...audit.filter(e=>!keys.has([e.tour,e.year,e.tournament].join('|'))),...newAudit]);
 assert.equal(snapshot.matches.length,baseline.length+played.length);
 assert.equal(snapshot.manifest.summary.tours.atp,previous.summary.tours.atp);
 assertReleaseCoverage(previous,snapshot.manifest);
 snapshot.manifest=attachIngestionHistory(previous,attachRecordChanges(previous,snapshot.manifest));
 assertSnapshotIntegrity(snapshot);
 await writeBundledSnapshot(snapshot);
 console.log(JSON.stringify({version:snapshot.manifest.version,playedAdded:played.length,terminalAdded:terminal.length,fixturesVerified:reviewed.length,matchCount:snapshot.matches.length,liveTennisCalls:0}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
