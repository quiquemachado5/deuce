import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const sources = JSON.parse(await fs.readFile('lib/player-directory-photo-sources.json', 'utf8'));
const directory = 'public/images/players/directory';
await fs.mkdir(directory, { recursive: true });

const manifest = {};
for (const item of sources) {
  if (!/^(CC BY(?:-SA)?|CC0)/.test(item.license) || !item.licenseUrl || !item.author || !new URL(item.url).hostname.endsWith('.wikimedia.org')) {
    throw new Error(`Unverified directory photo: ${item.name}`);
  }

  const slug = item.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const revision = createHash('sha1').update(item.title).digest('hex').slice(0, 8);
  const output = path.join(directory, `${slug}.webp`);
  const response = await fetch(item.url, {
    signal: AbortSignal.timeout(30_000),
    headers: { 'User-Agent': 'DEUCEArchive/1.0 (github.com/quiquemachado5/deuce)' },
  });
  if (!response.ok) throw new Error(`${item.name}: HTTP ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  await sharp(buffer).rotate().resize({ width: 1280, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toFile(output);

  const source = `https://commons.wikimedia.org/wiki/${encodeURIComponent(item.title).replace(/%20/g, '_')}`;
  manifest[item.name] = {
    src: `/images/players/directory/${slug}.webp?v=${revision}`,
    alt: `${item.name}${item.photoYear ? ` · ${item.photoYear}` : ''}`,
    credit: `${item.author} · ${item.license} · adaptación WebP por DEUCE`,
    source,
    licenseUrl: item.licenseUrl,
    ...(item.photoYear ? { photoYear: item.photoYear } : {}),
    objectPosition: item.objectPosition || '50% 30%',
    mobileObjectPosition: item.mobileObjectPosition || item.objectPosition || '50% 28%',
  };
  console.log(item.name);
}

await fs.writeFile('lib/player-directory-photo-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
