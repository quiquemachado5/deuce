import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import manifest from '../app/manifest';

const root = process.cwd();

test('brand icon suite exposes raster, vector and maskable install targets', async () => {
  const applicationManifest = manifest();
  const icons = applicationManifest.icons || [];
  assert.equal(applicationManifest.background_color, '#f5f6f7');
  assert.equal(applicationManifest.theme_color, '#151b20');
  assert.ok(icons.some(icon => icon.src === '/icon.svg' && icon.sizes === 'any'));
  assert.ok(icons.some(icon => icon.src === '/icons/deuce-192.png' && icon.sizes === '192x192'));
  assert.ok(icons.some(icon => icon.src === '/icons/deuce-512.png' && icon.sizes === '512x512'));
  assert.ok(icons.some(icon => icon.src === '/icons/deuce-maskable-512.png' && icon.purpose === 'maskable'));

  for (const [path, size] of [
    ['app/apple-icon.png', 180],
    ['public/icons/deuce-32.png', 32],
    ['public/icons/deuce-192.png', 192],
    ['public/icons/deuce-512.png', 512],
    ['public/icons/deuce-maskable-512.png', 512],
  ] as const) {
    const metadata = await sharp(join(root, path)).metadata();
    assert.equal(metadata.format, 'png', path);
    assert.equal(metadata.width, size, path);
    assert.equal(metadata.height, size, path);
  }
});

test('global typography owns every product surface without duplicate font loaders', async () => {
  const [layout, panorama, home] = await Promise.all([
    readFile(join(root, 'app/layout.tsx'), 'utf8'),
    readFile(join(root, 'components/PanoramaMatch.tsx'), 'utf8'),
    readFile(join(root, 'app/page.tsx'), 'utf8'),
  ]);
  assert.match(layout, /Bricolage_Grotesque, Geist/);
  assert.doesNotMatch(layout, /DM_Sans|Manrope|Newsreader/);
  assert.match(layout, /twitter:\s*\{/);
  assert.match(layout, /appleWebApp:/);
  assert.match(layout, /themeColor:/);
  assert.doesNotMatch(panorama, /next\/font/);
  assert.doesNotMatch(home, /DataDownload/);
  assert.match(home, /isAccessibleForFree:true/);
});
