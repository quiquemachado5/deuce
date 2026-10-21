import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { summarizeDataset, assertPublishableArchive } from '../lib/dataset-summary';
import { RULES_VERSION, SNAPSHOT_SCHEMA, type RecordManifest, type RecordPages } from '../lib/revista/snapshot';
import type { Match } from '../lib/types';
import { reviewedFinals, referenceFinal, referenceIssue } from '../lib/reviewed-finals';

async function main() {
  const read = async (name: string) => JSON.parse(gunzipSync(await readFile(`data/reading/${name}.json.gz`)).toString());
  const manifest: RecordManifest = await read('manifest');
  const matches: Match[] = await read('matches');
  assertPublishableArchive(matches);
  assert.equal(manifest.schema, SNAPSHOT_SCHEMA);
  assert.equal(manifest.rulesVersion, RULES_VERSION);
  assert.equal(manifest.mode, 'ARCHIVO REAL');
  assert.equal(manifest.matchCount, matches.length);
  assert.deepEqual(manifest.summary, summarizeDataset(matches));
  assert.equal(matches.find(match => match.match_id === 'archive-2914')?.surface, 'carpet');
  assert.ok(manifest.summary.surfaces.carpet > 10_000);
  assert.ok(manifest.summary.surfaces.unknown > 0);
  for (const reference of reviewedFinals) {
    const match = matches.find(candidate => referenceFinal(candidate) === reference);
    assert.ok(match, `Missing reviewed final: ${reference.tournament} ${reference.year}`);
    assert.equal(referenceIssue(match), null, `Reviewed final differs: ${reference.tournament} ${reference.year}`);
  }
  for (const meta of manifest.pieces) {
    const piece: RecordPages = await read(`piece-${meta.id}`);
    assert.equal(Object.values(piece.pages).reduce((sum, rows) => sum + rows.length, 0), meta.total, `${meta.id}: main pages`);
    assert.equal(Object.values(piece.smallPages).reduce((sum, rows) => sum + rows.length, 0), meta.smallTotal, `${meta.id}: small-sample pages`);
  }
  console.log(JSON.stringify({ verified: true, matches: matches.length, lists: manifest.pieces.length, reviewedFinals: reviewedFinals.length, version: manifest.version, surfaces: manifest.summary.surfaces }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
