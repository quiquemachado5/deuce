import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const manifests = [
  'lib/player-photo-manifest.json',
  'lib/player-photo-refresh.json',
  'lib/player-photo-additions.json',
  'lib/player-directory-photo-manifest.json',
  'lib/player-photo-discovery.json',
  'lib/player-photo-wta.json',
];

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

let generated = 0;
let linked = 0;
for (const manifestPath of manifests) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  let changed = false;
  for (const photo of Object.values(manifest)) {
    if (!photo || typeof photo !== 'object' || typeof photo.src !== 'string') continue;
    if (!photo.src.startsWith('/images/players/')) continue;
    if (typeof photo.thumbnail === 'string' && photo.thumbnail !== photo.src && await exists(path.join('public', photo.thumbnail))) continue;
    const source = path.join('public', photo.src);
    if (!await exists(source)) continue;
    const extension = path.extname(photo.src);
    const thumbnail = photo.src.slice(0, -extension.length) + '-small.webp';
    const output = path.join('public', thumbnail);
    if (!await exists(output)) {
      await sharp(source).rotate().resize({ width: 160, height: 220, fit: 'inside', withoutEnlargement: true }).webp({ quality: 76 }).toFile(output);
      generated += 1;
    }
    photo.thumbnail = thumbnail;
    changed = true;
    linked += 1;
  }
  if (changed) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(JSON.stringify({ generated, linked }, null, 2));
