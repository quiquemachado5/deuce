import { readdir, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { auditPublicMedia } from './public-media-audit.mjs';

const root = process.cwd();
const publicRoot = join(root, 'public');
const maximumPublicBytes = 125_000_000;
const maximumSingleAssetBytes = 7_000_000;

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
failures.push(...media.unoptimizedViolations);

console.log(JSON.stringify({
  verified: failures.length === 0,
  files: files.length,
  totalBytes,
  maximumPublicBytes,
  maximumSingleAssetBytes,
  media,
  warnings,
  failures,
}, null, 2));

if (failures.length) process.exitCode = 1;
