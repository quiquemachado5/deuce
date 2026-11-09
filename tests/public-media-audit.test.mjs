import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditPublicMedia } from '../build/public-media-audit.mjs';

test('public media is registered, responsive and free of raw portrait sources', async () => {
  const result = await auditPublicMedia();
  assert.deepEqual(result.orphaned, []);
  assert.deepEqual(result.missingReferenced, []);
  assert.deepEqual(result.missingResponsive, []);
  assert.deepEqual(result.rawOriginals, []);
});

test('missing primary image references fail the media inventory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'deuce-media-audit-'));
  try {
    await Promise.all(['app', 'components', 'lib', 'styles', 'public/images'].map(path => mkdir(join(root, path), { recursive: true })));
    await writeFile(join(root, 'app', 'page.tsx'), 'export default () => <><img src="/images/missing.webp"/><img src="/images/players/optimized/missing.webp"/></>;');
    await mkdir(join(root, 'public', 'images', 'players', 'optimized'), { recursive: true });
    await writeFile(join(root, 'public', 'images', 'players', 'optimized', 'missing-small.webp'), 'thumbnail');
    await writeFile(join(root, 'lib', 'player-photo-manifest.json'), '{}');
    const result = await auditPublicMedia(root);
    assert.deepEqual(result.missingReferenced, ['/images/missing.webp', '/images/players/optimized/missing.webp']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('unoptimized image exceptions stay explicit and cannot spread to new components', async () => {
  const result = await auditPublicMedia();
  assert.deepEqual(result.unoptimizedViolations, []);
  assert.equal(Object.values(result.unoptimizedCounts).reduce((sum, count) => sum + count, 0), 30);
});
