import { readdir, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import sharp from 'sharp';
import { auditPublicMedia } from './public-media-audit.mjs';

const root = process.cwd();
const publicRoot = join(root, 'public');
// Full historical edition library; this is disk footprint, not page transfer weight.
const maximumPublicBytes = 650_000_000;
const maximumSingleAssetBytes = 9_000_000;
const maximumPlayerPortraitWidth = 480;
const maximumPlayerPortraitHeight = 640;

async function walk(directory) {
  const rows = [];
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) rows.push(...await walk(path));
    else rows.push(path);
  }
  return rows;
}

const files = await walk(publicRoot);
const sized = await Promise.all(files.map(async path => ({ path, bytes: (await stat(path)).size })));
const playerPortraits = sized.filter(entry => {
  const name = relative(root, entry.path).split('\\').join('/');
  return /^public\/images\/players\/(?:discovered|wta-discovered)\/.+\.webp$/.test(name)
    && !name.endsWith('-small.webp');
});
const oversizedPlayerPortraits = [];
for (const entry of playerPortraits) {
  const metadata = await sharp(entry.path).metadata();
  if ((metadata.width || 0) <= maximumPlayerPortraitWidth && (metadata.height || 0) <= maximumPlayerPortraitHeight) continue;
  oversizedPlayerPortraits.push(`${relative(root, entry.path)}: ${metadata.width || '?'}x${metadata.height || '?'}`);
}
const totalBytes = sized.reduce((sum, entry) => sum + entry.bytes, 0);
const failures = [];
const warnings = [];
const media = await auditPublicMedia(root);

if (totalBytes > maximumPublicBytes) failures.push(`public/: ${totalBytes} > ${maximumPublicBytes} bytes`);
if (totalBytes / maximumPublicBytes >= 0.85) warnings.push(`public/: ${(totalBytes / maximumPublicBytes * 100).toFixed(1)}% of budget (${totalBytes}/${maximumPublicBytes} bytes)`);
for (const entry of sized) {
  const name = relative(root, entry.path);
  if (name.startsWith('public/images/courts/') && extname(name).toLowerCase() === '.jpg') {
    failures.push(`${name}: source JPG must stay at its credited external source; ship responsive WebP variants only`);
  }
  if (entry.bytes > maximumSingleAssetBytes) failures.push(`${name}: ${entry.bytes} > ${maximumSingleAssetBytes} bytes`);
}
for (const name of media.orphaned) failures.push(`${name}: public image is not registered or referenced`);
for (const name of media.missingReferenced) failures.push(`${name}: referenced public image is missing`);
for (const name of media.missingResponsive) failures.push(`${name}: promised responsive image is missing`);
for (const name of media.rawOriginals) failures.push(`${name}: source raster must not ship from public/`);
for (const name of oversizedPlayerPortraits) {
  failures.push(`${name} exceeds ${maximumPlayerPortraitWidth}x${maximumPlayerPortraitHeight}`);
}
failures.push(...media.unoptimizedViolations);

console.log(JSON.stringify({
  verified: failures.length === 0,
  files: files.length,
  totalBytes,
  maximumPublicBytes,
  maximumSingleAssetBytes,
  playerPortraits: {
    files: playerPortraits.length,
    maximumWidth: maximumPlayerPortraitWidth,
    maximumHeight: maximumPlayerPortraitHeight,
    oversized: oversizedPlayerPortraits,
  },
  media,
  warnings,
  failures,
}, null, 2));

if (failures.length) process.exitCode = 1;
