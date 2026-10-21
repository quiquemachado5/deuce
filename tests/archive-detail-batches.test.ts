import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMissingDetails } from '../lib/archive-detail-batches';

test('detail loading fetches only unique keys absent from the bundled snapshot', async () => {
  const calls: string[][] = [];
  const result = await loadMissingDetails(
    ['detail:bundled', 'detail:first', 'detail:first', 'detail:second', 'detail:bundled'],
    new Set(['detail:bundled']),
    async keys => {
      calls.push(keys);
      return keys.map(key => ({ key, payload: { id: key.slice(7) } }));
    },
  );
  assert.deepEqual(calls, [['detail:first', 'detail:second']]);
  assert.deepEqual(result, { first: { id: 'first' }, second: { id: 'second' } });
});

test('empty and fully bundled detail indexes need no remote requests', async () => {
  const fetchBatch = async () => { throw new Error('unexpected remote request'); };
  assert.deepEqual(await loadMissingDetails([], new Set(), fetchBatch), {});
  assert.deepEqual(await loadMissingDetails(['detail:bundled'], new Set(['detail:bundled']), fetchBatch), {});
});

test('detail loading materializes every payload with at most 25 keys per batch and four batches in flight', async () => {
  const keys = Array.from({ length: 237 }, (_, index) => `detail:match-${index}`);
  const calls: string[][] = [];
  let active = 0, peak = 0;
  const result = await loadMissingDetails(keys, new Set(), async batch => {
    calls.push(batch);
    assert.ok(batch.length > 0 && batch.length <= 25);
    active++;
    peak = Math.max(peak, active);
    await new Promise<void>(resolve => setImmediate(resolve));
    active--;
    return [...batch].reverse().map(key => ({ key, payload: { id: key.slice(7) } }));
  });
  assert.equal(peak, 4);
  assert.equal(active, 0);
  assert.deepEqual(calls.flat(), keys);
  assert.equal(Object.keys(result).length, keys.length);
  for (const key of keys) assert.deepEqual(result[key.slice(7)], { id: key.slice(7) });
});

test('a failed detail batch rejects the load after earlier batches succeeded', async () => {
  const keys = Array.from({ length: 125 }, (_, index) => `detail:match-${index}`);
  const failure = new Error('detail request failed');
  const fetched: string[] = [];
  await assert.rejects(loadMissingDetails(keys, new Set(), async batch => {
    if (batch.includes('detail:match-100')) throw failure;
    fetched.push(...batch);
    return batch.map(key => ({ key, payload: key.slice(7) }));
  }), error => error === failure);
  assert.equal(fetched.length, 100);
});
