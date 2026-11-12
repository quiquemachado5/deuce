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
});

test('dynamic catalogue media are inventoried and a new unoptimized component is rejected',async()=>{
 const root=await mkdtemp(join(tmpdir(),'deuce-media-catalogue-'));
 try{
  await Promise.all(['components','lib','data/media','public/media/test'].map(path=>mkdir(join(root,path),{recursive:true})));
  await writeFile(join(root,'lib/player-photo-manifest.json'),'{}');
  await writeFile(join(root,'data/media/tournament-library.json'),JSON.stringify({photos:[{src:'/media/test/edition.webp'}]}));
  await writeFile(join(root,'public/media/test/edition.webp'),'image');
  await writeFile(join(root,'components/Unexpected.tsx'),'<Image src="/media/test/edition.webp" unoptimized/>');
  const result=await auditPublicMedia(root);assert.deepEqual(result.orphaned,[]);assert.deepEqual(result.missingReferenced,[]);
  assert.deepEqual(result.unoptimizedViolations,['components/Unexpected.tsx: 1 unoptimized image use']);
 }finally{await rm(root,{recursive:true,force:true})}
});
