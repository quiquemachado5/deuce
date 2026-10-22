import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync,gunzipSync } from 'node:zlib';
import {createHash} from 'node:crypto';
import {compressedJson} from '../lib/revista/publish-snapshot';
import { mockMatches } from '../lib/mocks';
import { compileRecordSnapshot } from '../lib/revista/snapshot';
import { selectGeneration, generationMetadata, type PreparedGeneration } from '../lib/revista/generation';
import { decodeCloudBlob } from '../lib/revista/read-records';
import { assertReleaseCoverage } from '../lib/revista/release-check';

const matches = mockMatches.map(match => ({ ...match, data_source: 'api' as const }));
const before = compileRecordSnapshot(matches.slice(0, 2), new Date('2026-10-20T08:00:00Z'));
const after = compileRecordSnapshot(matches, new Date('2026-10-21T08:00:00Z'));
const base: PreparedGeneration = { manifest: before.manifest, source: 'bundled', matches: async () => before.matches, records: async () => before.players };
const complete = async () => ({ matches: after.matches, records: after.players });

test('bounded serialization and incremental hash preserve the exact snapshot format',async()=>{
  const json=JSON.stringify(after.matches);
  assert.equal(gunzipSync(await compressedJson(after.matches)).toString(),json);
  const m=after.manifest;
  assert.equal(m.version,createHash('sha256').update(JSON.stringify([m.schema,m.rulesVersion,m.generatedAt.slice(0,10),after.matches,after.competition,after.audit])).digest('hex').slice(0,20));
});

test('a complete remote generation supplies manifest, matches and players together', async () => {
  const chosen = await selectGeneration(base, after.manifest, complete, true);
  assert.equal(chosen.source, 'remote');
  assert.equal(chosen.manifest.matchCount, (await chosen.matches()).length);
  assert.equal(generationMetadata(chosen).datasetVersion, after.manifest.version);
  assert.deepEqual(await chosen.records(), after.players);
});

test('partial, corrupt or unavailable remote payloads fall back as a whole', async () => {
  const loaders = [
    async () => ({ matches: after.matches, records: undefined }),
    async () => ({ matches: after.matches.slice(1), records: after.players }),
    async () => ({ matches: after.matches, records: [{ ...after.players[0], played: 999 }] }),
    async () => { throw new Error('timeout'); },
  ];
  for (const load of loaders) {
    const chosen = await selectGeneration(base, after.manifest, load, true);
    assert.equal(chosen.fallbackReason, 'remote-incomplete');
    assert.equal(chosen.manifest.version, before.manifest.version);
    assert.deepEqual(await chosen.matches(), before.matches);
    assert.deepEqual(await chosen.records(), before.players);
  }
});

test('schema, summary and demo corruption are rejected without changing generations', async () => {
  assert.equal((await selectGeneration(base, { ...after.manifest, schema: 5 }, complete, true)).fallbackReason, 'remote-incompatible');
  assert.equal((await selectGeneration(base, { ...after.manifest, summary: before.manifest.summary }, complete, true)).fallbackReason, 'remote-incomplete');
  assert.equal((await selectGeneration(base, after.manifest, async () => ({ matches: mockMatches, records: after.players }), true)).fallbackReason, 'remote-incomplete');
});

test('offline, absent, failed and older publication states are distinguishable', async () => {
  assert.equal((await selectGeneration(base, null, complete, false)).fallbackReason, undefined);
  assert.equal((await selectGeneration(base, null, complete, true)).fallbackReason, 'not-published');
  assert.equal((await selectGeneration(base, undefined, complete, true)).fallbackReason, 'remote-unavailable');
  const older = { ...before.manifest, schema: 5, generatedAt: '2026-10-19T08:00:00Z' };
  assert.equal((await selectGeneration(base, older, complete, true)).fallbackReason, undefined);
});

test('compressed cloud reads require every chunk and respect a bounded wait', async () => {
  const value = { valid: true }, encoded = gzipSync(JSON.stringify(value)).toString('base64'), cut = Math.floor(encoded.length / 2);
  const payload = { encoding: 'gzip-chunks', chunks: 2 };
  assert.deepEqual(await decodeCloudBlob(payload, async index => ({ chunk: index ? encoded.slice(cut) : encoded.slice(0, cut) })), value);
  assert.equal(await decodeCloudBlob(payload, async index => index ? undefined : { chunk: encoded.slice(0, cut) }), undefined);
  assert.equal(await decodeCloudBlob({ gzip: 'corrupt' }, async () => null), undefined);
  assert.equal(await decodeCloudBlob(payload, async () => new Promise(() => {}), 5), undefined);
});

test('release gate rejects losses of published matches or measured coverage', () => {
  const metric = { ...after.manifest.pieces[0], measured: true, sample: 10 };
  const previous = { ...after.manifest, pieces: [metric] };
  assert.doesNotThrow(() => assertReleaseCoverage(previous, previous));
  assert.throws(() => assertReleaseCoverage(previous, { ...previous, matchCount: previous.matchCount - 1 }), /lose published matches/);
  assert.throws(() => assertReleaseCoverage(previous, { ...previous, pieces: [] }), /measured coverage/);
  assert.throws(() => assertReleaseCoverage(previous, { ...previous, pieces: [{ ...metric, sample: 9 }] }), /measured coverage/);
});
