import { readdir, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const publicRoot = join(root, 'public');
const maximumPublicBytes = 160_000_000;
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

if (totalBytes > maximumPublicBytes) failures.push(`public/: ${totalBytes} > ${maximumPublicBytes} bytes`);
for (const entry of sized) {
  const name = relative(root, entry.path);
  if (name.startsWith('public/images/courts/') && extname(name).toLowerCase() === '.jpg') {
    failures.push(`${name}: source JPG must stay at its credited external source; ship responsive WebP variants only`);
  }
  if (entry.bytes > maximumSingleAssetBytes) failures.push(`${name}: ${entry.bytes} > ${maximumSingleAssetBytes} bytes`);
}

console.log(JSON.stringify({
  verified: failures.length === 0,
  files: files.length,
  totalBytes,
  maximumPublicBytes,
  maximumSingleAssetBytes,
  failures,
}, null, 2));

if (failures.length) process.exitCode = 1;
