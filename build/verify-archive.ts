import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { summarizeDataset, assertPublishableArchive } from '../lib/dataset-summary';
import { RULES_VERSION, SNAPSHOT_SCHEMA, type RecordManifest, type RecordPages } from '../lib/revista/snapshot';
import type { Match } from '../lib/types';
import { reviewedFinals, referenceFinal, referenceIssue } from '../lib/reviewed-finals';
import { editionCompleteness, type EditionAudit } from '../lib/edition-audit';
import { readingSource } from './reading-source';
import { expectedBundledPieceCount, loadBundledSnapshotPieces } from '../lib/revista/seed-snapshot';
import { MATCH_BROWSER_DICTIONARIES, MATCH_BROWSER_ROW_LENGTH, MATCH_BROWSER_SCHEMA, type MatchBrowserIndex, type MatchBrowserPartition } from '../lib/match-browser-snapshot';

async function main() {
  const root = readingSource();
  const read = async (name: string) => JSON.parse(gunzipSync(await readFile(`${root}/${name}.json.gz`)).toString());
  const manifest: RecordManifest = await read('manifest');
  const matches: Match[] = await read('matches');
  assertPublishableArchive(matches);
  assert.equal(manifest.schema, SNAPSHOT_SCHEMA);
  assert.equal(manifest.rulesVersion, RULES_VERSION);
  assert.equal(manifest.mode, 'ARCHIVO REAL');
  assert.equal(manifest.matchCount, matches.length);
  assert.deepEqual(manifest.summary, summarizeDataset(matches));
  const competition: Match[] = await read('competition');
  const audit: EditionAudit[] = await read('audit');
  const players = await read('players');
  const eras = await read('eras');
  assert.equal(competition.length, manifest.competitionCount);
  assert.equal(audit.length, manifest.editionCount);
  assert.equal(new Set([...matches, ...competition].map(row => row.match_id)).size, matches.length + competition.length);
  assert.ok(Array.isArray(players) && players.length > 0);
  assert.ok(eras && typeof eras === 'object' && !Array.isArray(eras));
  assert.ok(audit.every((row: {sourceRows:number;completed:number;terminal:number;pending:number}) => row.sourceRows === row.completed + row.terminal + row.pending));
  assert.ok(audit.every(row => JSON.stringify(editionCompleteness(row)) === JSON.stringify({expectedLateRounds:row.expectedLateRounds,missingLateRounds:row.missingLateRounds,completeDraw:row.completeDraw})));
  assert.ok(manifest.summary.surfaces.carpet > 1_000);
  assert.equal(Object.values(manifest.summary.surfaces).reduce((sum,count)=>sum+count,0),matches.length);
  for (const reference of reviewedFinals) {
    const match = matches.find(candidate => referenceFinal(candidate) === reference);
    assert.ok(match, `Missing reviewed final: ${reference.tournament} ${reference.year}`);
    assert.equal(referenceIssue(match), null, `Reviewed final differs: ${reference.tournament} ${reference.year}`);
  }
  const pieces = await loadBundledSnapshotPieces(manifest, read);
  assert.equal(Object.keys(pieces).length, expectedBundledPieceCount(manifest));
  for (const {meta,key} of [
    ...manifest.pieces.map(meta=>({meta,key:meta.id})),
    ...(manifest.circuitPieces?.wta || []).map(meta=>({meta,key:`wta-${meta.id}`})),
  ]) {
    const piece: RecordPages = pieces[key];
    assert.ok(piece, `${key}: missing piece`);
    assert.equal(Object.values(piece.pages).reduce((sum, rows) => sum + rows.length, 0), meta.total, `${key}: main pages`);
    assert.equal(Object.values(piece.smallPages).reduce((sum, rows) => sum + rows.length, 0), meta.smallTotal, `${key}: small-sample pages`);
  }
  const browserIndex: MatchBrowserIndex = await read('browser-index');
  assert.equal(browserIndex.schema, MATCH_BROWSER_SCHEMA);
  assert.equal(browserIndex.count, manifest.matchCount);
  assert.equal(browserIndex.partitions.reduce((sum, partition) => sum + partition.count, 0), manifest.matchCount);
  const matchIds=new Set(matches.map(match=>match.match_id)),browserIds=new Set<string>();
  for(const meta of browserIndex.partitions){
    const partition:MatchBrowserPartition=await read(`browser-${meta.id}`);
    assert.equal(partition.schema,MATCH_BROWSER_SCHEMA,`${meta.id}: schema`);
    assert.equal(partition.id,meta.id,`${meta.id}: id`);
    assert.equal(partition.tour,meta.tour,`${meta.id}: tour`);
    assert.equal(partition.fromYear,meta.fromYear,`${meta.id}: fromYear`);
    assert.equal(partition.toYear,meta.toYear,`${meta.id}: toYear`);
    assert.equal(partition.count,meta.count,`${meta.id}: count`);
    assert.ok(MATCH_BROWSER_DICTIONARIES.every(key=>Array.isArray(partition.dictionaries[key as keyof typeof partition.dictionaries])),`${meta.id}: dictionaries`);
    assert.equal(partition.rows.length,meta.count,`${meta.id}: rows`);
    for(const row of partition.rows){assert.equal(row.length,MATCH_BROWSER_ROW_LENGTH,`${meta.id}: row schema`);assert.ok(matchIds.has(row[0]),`${meta.id}: unknown match ${row[0]}`);assert.ok(!browserIds.has(row[0]),`${meta.id}: duplicate match ${row[0]}`);browserIds.add(row[0]);}
  }
  assert.equal(browserIds.size,matchIds.size);
  console.log(JSON.stringify({ verified: true, matches: matches.length, lists: Object.keys(pieces).length, browserPartitions:browserIndex.partitions.length, reviewedFinals: reviewedFinals.length, version: manifest.version, surfaces: manifest.summary.surfaces }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
