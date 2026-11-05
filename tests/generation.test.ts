import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync,gunzipSync } from 'node:zlib';
import {createHash} from 'node:crypto';
import {compressedJson} from '../lib/revista/publish-snapshot';
import { mockMatches } from '../lib/mocks';
import { compileRecordSnapshot } from '../lib/revista/snapshot';
import { assertGenerationCoherence, selectGeneration, generationMetadata, type PreparedGeneration } from '../lib/revista/generation';
import { decodeCloudBlob } from '../lib/revista/read-records';
import { assertEditionCoverage, assertReleaseCoverage } from '../lib/revista/release-check';
import { asyncCache } from '../lib/async-cache';
import { archiveStoreBackend, listArchiveKeys } from '../lib/archive-store';

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

test('a transient artifact failure cannot mix a remote browser decision with bundled detail', async () => {
  const decision = { manifest: after.manifest, source: 'remote' as const };
  const fallback = await selectGeneration(base, after.manifest, async () => { throw new Error('transient read failure'); }, true);
  assert.equal(fallback.source, 'bundled');
  assert.throws(() => assertGenerationCoherence(decision, fallback), /Snapshot generation changed after selection/);
  const coherent = { ...base, manifest: after.manifest, source: 'remote' as const };
  assert.equal(assertGenerationCoherence(decision, coherent), coherent);
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

test('the archive prefers the self-hosted filesystem, retains Supabase and rejects invalid prefixes',async()=>{
  assert.equal(archiveStoreBackend({DEUCE_ARCHIVE_DIR:'/var/lib/deuce/archive',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'secret'}),'filesystem');
  assert.equal(archiveStoreBackend({SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'secret'}),'supabase');
  assert.equal(archiveStoreBackend({}),null);
  await assert.rejects(listArchiveKeys('../outside'),/Invalid archive key/);
});

test('a transient generation failure expires immediately while a healthy result is reused',async()=>{
  let loads=0;
  const generations=asyncCache<{healthy:boolean}>(1000,1,result=>result.healthy?1000:0);
  const load=async()=>({healthy:++loads>1});
  assert.equal((await generations('active',load)).healthy,false);
  assert.equal((await generations('active',load)).healthy,true);
  assert.equal((await generations('active',load)).healthy,true);
  assert.equal(loads,2);
});

test('bounded caches expose hit, miss, eviction and failure diagnostics',async()=>{
  const values=asyncCache<number>(1000,1);
  assert.equal(await values('first',async()=>1),1);
  assert.equal(await values('first',async()=>2),1);
  assert.equal(await values('second',async()=>2),2);
  await assert.rejects(()=>values('broken',async()=>{throw new Error('broken')}),/broken/);
  assert.deepEqual(values.stats(),{hits:1,misses:3,evictions:2,failures:1,entries:0,capacity:1,weight:0,maxWeight:0});
});

test('bounded caches use LRU order and enforce a value-weight budget',async()=>{
  const values=asyncCache<string>(10_000,4,undefined,{maxWeight:6,weight:value=>value.length});
  await values('a',async()=>'aa');
  await values('b',async()=>'bb');
  await values('a',async()=>'unused');
  await values('c',async()=>'cccc');
  assert.equal(values.stats().weight,6);
  assert.equal(values.stats().entries,2);
  assert.equal(await values('a',async()=>'aa'),'aa');
  assert.equal(values.stats().hits,2);
  assert.equal(values.stats().evictions,1);
});

test('release gate rejects losses of published matches or measured coverage', () => {
  const metric = { ...after.manifest.pieces[0], measured: true, sample: 10 };
  const previous = { ...after.manifest, pieces: [metric] };
  assert.doesNotThrow(() => assertReleaseCoverage(previous, previous));
  assert.throws(() => assertReleaseCoverage(previous, { ...previous, matchCount: previous.matchCount - 1 }), /lose published matches/);
  assert.throws(() => assertReleaseCoverage(previous, { ...previous, pieces: [] }), /measured coverage/);
  assert.throws(() => assertReleaseCoverage(previous, { ...previous, pieces: [{ ...metric, sample: 9 }] }), /measured coverage/);
  const mixed = { ...previous, matchCount: 30, summary: { ...previous.summary, tours: { atp: 20, wta: 10 } } };
  assert.throws(() => assertReleaseCoverage(mixed, { ...mixed, summary: { ...mixed.summary, tours: { atp: 21, wta: 9 } } }), /lose published WTA matches/);
  assert.throws(() => assertReleaseCoverage(mixed, { ...mixed, summary: { ...mixed.summary, tours: { atp: 19, wta: 11 } } }), /lose published ATP matches/);
  const wtaMetric = { ...metric, id: 'wta-metric', measured: true, sample: 8 };
  const withWta = { ...previous, circuitPieces: { atp: previous.pieces, wta: [wtaMetric] } };
  const wtaUnmeasured = { ...wtaMetric, measured: false };
  const withWtaUnmeasured = { ...previous, circuitPieces: { atp: previous.pieces, wta: [wtaUnmeasured] } };
  assert.throws(() => assertReleaseCoverage(withWtaUnmeasured, { ...withWtaUnmeasured, circuitPieces: { atp: withWtaUnmeasured.pieces, wta: [] } }), /lose WTA record catalogue/);
  const datedWta = { ...previous, circuitPieces: { atp: previous.pieces, wta: [{ ...wtaUnmeasured, id: 'tal-dia-como-hoy' }] } };
  assert.doesNotThrow(() => assertReleaseCoverage(datedWta, { ...datedWta, circuitPieces: { atp: datedWta.pieces, wta: [] } }));
  assert.throws(() => assertReleaseCoverage(withWta, { ...withWta, circuitPieces: { atp: withWta.pieces, wta: [] } }), /measured WTA coverage/);
  assert.throws(() => assertReleaseCoverage(withWta, { ...withWta, circuitPieces: { atp: withWta.pieces, wta: [{ ...wtaMetric, sample: 7 }] } }), /measured WTA coverage/);
});
test('release gate preserves editions whose late rounds were already complete',()=>{
  const complete:import('../lib/edition-audit').EditionAudit={tournament:'Madrid',year:2025,category:'Masters 1000',sourceRows:7,completed:7,terminal:0,pending:0,hasFinal:true,rounds:{'5':4,'6':2,'7':1},expectedLateRounds:true,missingLateRounds:[],completeDraw:true};
  assert.doesNotThrow(()=>assertEditionCoverage([complete],[complete]));
  assert.doesNotThrow(()=>assertEditionCoverage([complete],[{...complete,sourceRows:10,pending:3,completeDraw:false}]));
  assert.throws(()=>assertEditionCoverage([complete],[{...complete,sourceRows:10,completed:6,pending:4,completeDraw:false}]),/complete edition incomplete/);
  assert.throws(()=>assertEditionCoverage([complete],[{...complete,rounds:{'5':4,'6':1,'7':1},missingLateRounds:['1 semifinal'],completeDraw:false}]),/complete edition incomplete/);
});
