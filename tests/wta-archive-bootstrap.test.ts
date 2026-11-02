import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { gzipSync } from 'node:zlib';
import { materializeBundledWtaArchive } from '../lib/wta-archive-bootstrap';

async function fixture(files: Record<string, unknown>) {
  const root = await mkdtemp(join(tmpdir(), 'deuce-wta-bootstrap-'));
  for (const [file, payload] of Object.entries(files)) {
    await writeFile(join(root, file), gzipSync(JSON.stringify(payload)));
  }
  return root;
}

test('bundled complete WTA cohorts are materialized and indexed before provider work', async t => {
  const root = await fixture({
    'archive-2022-G.json.gz': { complete: true, at: '2026-11-01T00:00:00Z', data: [{ id: 1, tour: 'wta' }] },
    'archive-2022-A.json.gz': { complete: true, at: '2026-11-01T00:00:00Z', data: [{ id: 2, tour: 'wta', value: 'bundle' }] },
  });
  t.after(() => rm(root, { recursive: true, force: true }));
  const stored = new Map<string, unknown>([
    ['wta-archive-index', { complete: ['2021-G'], at: '2026-10-01T00:00:00Z' }],
    ['archive-wta-2022-A', { complete: false, nextOffset: 200, data: [{ id: 2, tour: 'wta', value: 'provider' }, { id: 3, tour: 'wta' }] }],
  ]);
  const writes: string[] = [];
  const report = await materializeBundledWtaArchive(
    async key => stored.get(key),
    async (key, payload) => { writes.push(key); stored.set(key, payload); },
    root,
    '2026-11-02T12:00:00Z',
  );

  assert.deepEqual(writes, ['archive-wta-2022-A', 'archive-wta-2022-G', 'wta-archive-index']);
  assert.deepEqual(report, {
    bundledModernSeasons: [],
    completedModernSeasons: [],
    materializedModernSeasons: 0,
    adoptedModernSeasons: 0,
    retainedModernSeasons: 0,
    materializedModernRows: 0,
    seasonStateUpdated: false,
    bundledCohorts: 2,
    completedCohorts: 3,
    materializedCohorts: 2,
    adoptedCohorts: 0,
    retainedCohorts: 0,
    materializedRows: 3,
    indexUpdated: true,
  });
  const merged = stored.get('archive-wta-2022-A') as { complete: boolean; nextOffset: number; total: number; data: Array<{ id: number; value?: string }> };
  assert.equal(merged.complete, true);
  assert.equal(merged.nextOffset, 0);
  assert.equal(merged.total, 2);
  assert.equal(merged.data.find(row => row.id === 2)?.value, 'provider');
  assert.deepEqual((stored.get('wta-archive-index') as { complete: string[] }).complete, ['2021-G', '2022-A', '2022-G']);
});

test('an existing complete cohort is adopted into an empty index without rewriting its rows', async t => {
  const root = await fixture({
    'archive-2022-G.json.gz': { complete: true, data: [{ id: 1, tour: 'wta' }] },
  });
  t.after(() => rm(root, { recursive: true, force: true }));
  const existing = { complete: true, data: [{ id: 9, tour: 'wta' }] };
  const stored = new Map<string, unknown>([['archive-wta-2022-G', existing]]);
  const writes: string[] = [];
  const report = await materializeBundledWtaArchive(
    async key => stored.get(key),
    async (key, payload) => { writes.push(key); stored.set(key, payload); },
    root,
  );

  assert.deepEqual(writes, ['wta-archive-index']);
  assert.equal(stored.get('archive-wta-2022-G'), existing);
  assert.equal(report.adoptedCohorts, 1);
  assert.equal(report.materializedCohorts, 0);
  assert.deepEqual((stored.get('wta-archive-index') as { complete: string[] }).complete, ['2022-G']);
});

test('an indexed bundled cohort is retained without reading or rewriting its large payload', async t => {
  const root = await fixture({
    'archive-2022-G.json.gz': { complete: true, data: [{ id: 1, tour: 'wta' }] },
  });
  t.after(() => rm(root, { recursive: true, force: true }));
  const reads: string[] = [];
  const writes: string[] = [];
  const report = await materializeBundledWtaArchive(
    async key => { reads.push(key); return key === 'wta-archive-index' ? { complete: ['2022-G'] } : undefined; },
    async key => { writes.push(key); },
    root,
  );

  assert.deepEqual(reads, ['wta-season-state', 'wta-archive-index']);
  assert.deepEqual(writes, []);
  assert.equal(report.retainedCohorts, 1);
  assert.equal(report.indexUpdated, false);
});

test('modern WTA seasons seed closed progress while the current season remains refreshable', async t => {
  const root = await fixture({
    'modern-2023.json.gz': { complete: true, scope: 'wta-main-v2', data: [{ id: 1, tour: 'wta' }] },
    'modern-2025.json.gz': { complete: true, scope: 'wta-main-v2', data: [{ id: 2, tour: 'wta' }] },
    'modern-2026.json.gz': { complete: true, scope: 'wta-main-v2', data: [{ id: 3, tour: 'wta' }, { id: 4, tour: 'wta' }] },
  });
  t.after(() => rm(root, { recursive: true, force: true }));
  const existing2025 = { scope: 'wta-main-v2', data: [{ id: 2, tour: 'wta', value: 'provider' }, { id: 20, tour: 'wta' }] };
  const stored = new Map<string, unknown>([
    ['wta-season-state', { completed: [2025, 2026] }],
    ['season-wta-2025', existing2025],
    ['season-wta-2026', { scope: 'wta-main-v2', data: [{ id: 3, tour: 'wta', value: 'provider' }] }],
  ]);
  const writes: string[] = [];
  const run = () => materializeBundledWtaArchive(
    async key => stored.get(key),
    async (key, payload) => { writes.push(key); stored.set(key, payload); },
    root,
    '2026-11-02T12:00:00Z',
  );

  const report = await run();
  assert.deepEqual(writes, ['season-wta-2023', 'season-wta-2026', 'wta-season-state']);
  assert.deepEqual(report.bundledModernSeasons, [2023, 2025, 2026]);
  assert.deepEqual(report.completedModernSeasons, [2023, 2025]);
  assert.equal(report.materializedModernSeasons, 2);
  assert.equal(report.adoptedModernSeasons, 0);
  assert.equal(report.retainedModernSeasons, 1);
  assert.equal(report.materializedModernRows, 3);
  assert.equal(report.seasonStateUpdated, true);
  assert.equal(stored.get('season-wta-2025'), existing2025);
  const current = stored.get('season-wta-2026') as { data: Array<{ id: number; value?: string }> };
  assert.deepEqual(current.data.map(row => row.id), [3, 4]);
  assert.equal(current.data.find(row => row.id === 3)?.value, 'provider');
  assert.deepEqual((stored.get('wta-season-state') as { completed: number[] }).completed, [2023, 2025]);

  writes.length = 0;
  const repeated = await run();
  assert.deepEqual(writes, []);
  assert.equal(repeated.materializedModernSeasons, 0);
  assert.equal(repeated.retainedModernSeasons, 3);
  assert.equal(repeated.seasonStateUpdated, false);
});
