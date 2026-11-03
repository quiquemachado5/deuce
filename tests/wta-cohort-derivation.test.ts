import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { deriveWtaCohortsFromBroadArchive, sameWtaCohortRows } from '../lib/wta-cohort-derivation';

const read = async (name: string) => JSON.parse(gunzipSync(await readFile(new URL(`../data/archive/wta/${name}`, import.meta.url))).toString()) as unknown;

test('broad WTA cohorts reproduce every committed level file exactly', async () => {
  for (const year of [2018, 2019, 2020, 2021, 2022]) {
    const cohorts = deriveWtaCohortsFromBroadArchive(await read(`archive-${year}-A.json.gz`), year);
    for (const level of ['PM', 'P', 'I', 'F']) {
      const id = `${year}-${level}`;
      const saved = await read(`archive-${id}.json.gz`);
      assert.equal(sameWtaCohortRows(saved, cohorts[id]), true, id);
    }
  }
});

test('broad WTA derivation preserves rows, empty levels and source timestamp', () => {
  const source = {
    complete: true,
    at: '2026-11-02T14:12:44.431Z',
    data: [
      { id: 1, tour: 'wta', level: 'P', event_date: '2020-01-01', score: '6-4 6-4' },
      { id: 2, tour: 'wta', level: 'I', event_date: '2020-02-01', score: '7-6 6-2' },
    ],
  };
  const cohorts = deriveWtaCohortsFromBroadArchive(source, 2020);
  assert.strictEqual(cohorts['2020-P'].data[0], source.data[0]);
  assert.deepEqual(cohorts['2020-PM'].data, []);
  assert.deepEqual(cohorts['2020-F'].data, []);
  assert.equal(cohorts['2020-I'].at, source.at);
  assert.equal(cohorts['2020-I'].scope, 'derived-from-2020-A');
  assert.equal(cohorts['2020-I'].total, 1);
});

test('broad WTA derivation rejects incomplete, contaminated and duplicate sources', () => {
  const valid = (data: Array<Record<string, unknown>>) => ({ complete: true, at: '2026-11-02T14:12:44.431Z', data: data.map(row => ({ event_date: '2020-01-01', ...row })) });
  assert.throws(() => deriveWtaCohortsFromBroadArchive({ complete: false, data: [] }, 2020), /incomplete/);
  assert.throws(() => deriveWtaCohortsFromBroadArchive(valid([{ id: 1, tour: 'atp', level: 'P' }]), 2020), /another circuit/);
  assert.throws(() => deriveWtaCohortsFromBroadArchive(valid([
    { id: 1, tour: 'wta', level: 'P' },
    { id: 1, tour: 'wta', level: 'I' },
  ]), 2020), /repeats match/);
  assert.throws(() => deriveWtaCohortsFromBroadArchive(valid([{ id: 1, tour: 'wta', level: 'P', event_date: '2021-01-01' }]), 2020), /another season/);
});
