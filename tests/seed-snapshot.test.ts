import test from 'node:test';
import assert from 'node:assert/strict';
import { bundledSeedAction, expectedBundledPieceCount, loadBundledSnapshotPieces } from '../lib/revista/seed-snapshot';
import { RULES_VERSION, SNAPSHOT_SCHEMA, type RecordManifest, type RecordPages } from '../lib/revista/snapshot';

const pages = (): RecordPages => ({ pages: { '1': [] }, smallPages: {} });

test('initial archive seed loads ATP and WTA pieces with their published keys', async () => {
  const manifest = {
    pieces: [{ id: 'victorias' }, { id: 'finales' }],
    circuitPieces: { atp: [], wta: [{ id: 'victorias' }, { id: 'aces' }] },
  } as unknown as RecordManifest;
  const requested: string[] = [];
  const pieces = await loadBundledSnapshotPieces(manifest, async artifact => {
    requested.push(artifact);
    return pages();
  });
  assert.deepEqual(requested, ['piece-victorias', 'piece-finales', 'piece-wta-victorias', 'piece-wta-aces']);
  assert.deepEqual(Object.keys(pieces), ['victorias', 'finales', 'wta-victorias', 'wta-aces']);
  assert.equal(expectedBundledPieceCount(manifest), 4);
});

test('seed keeps current rules, initializes an empty store and migrates older rules', () => {
  const current = {
    schema: SNAPSHOT_SCHEMA, rulesVersion: RULES_VERSION, version: 'a'.repeat(20), generatedAt: '2026-11-02T12:00:00Z',
    matchCount: 1, pieces: [], years: [2026], eraCuts: [], mode: 'ARCHIVO REAL',
    summary: { years: [], surfaces: {}, tours: { atp: 1, wta: 0 } },
  } as unknown as RecordManifest;
  assert.equal(bundledSeedAction(current), 'keep');
  assert.equal(bundledSeedAction(undefined), 'seed');
  assert.equal(bundledSeedAction({ ...current, rulesVersion: 'older-rules' }), 'migrate');
});
