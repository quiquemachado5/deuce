// Discover reusable player portraits without accepting an ambiguous search result.
// Usage: node build/discover-player-photos.mjs --scan=250 --max=100
import fs from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const userAgent = 'DEUCEArchive/1.0 (github.com/quiquemachado5/deuce)';
const wikidataQuery = 'https://query.wikidata.org/sparql';
const commonsApi = 'https://commons.wikimedia.org/w/api.php';
const outputDirectory = 'public/images/players/discovered';
const manifestFile = 'lib/player-photo-discovery.json';
const sourcesFile = 'lib/player-photo-discovery-sources.json';

const numericArgument = (name, fallback) => {
  const raw = process.argv.find(argument => argument.startsWith(`--${name}=`))?.split('=')[1];
  return raw && Number.isFinite(Number(raw)) ? Math.max(0, Number(raw)) : fallback;
};
const scanLimit = numericArgument('scan', 250);
const photoLimit = numericArgument('max', 100);
const dryRun = process.argv.includes('--dry-run');

function normalize(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[’'‐‑‒–—-]/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function slug(value) {
  return normalize(value).replace(/ /g, '-');
}
function text(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ').trim();
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function json(url, parameters) {
  const query = new URLSearchParams({ ...parameters, format: 'json', origin: '*' });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await sleep(650);
    const response = await fetch(`${url}?${query}`, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(30_000),
    });
    if (response.ok) return response.json();
    if (response.status !== 429 && response.status < 500) throw new Error(`${url}: HTTP ${response.status}`);
    if (attempt < 3) await sleep(2_000 * (attempt + 1));
  }
  throw new Error(`${url}: retries exhausted`);
}
async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}

const playerPayload = JSON.parse(gunzipSync(await fs.readFile('data/reading/players.json.gz')).toString());
const players = Array.isArray(playerPayload) ? playerPayload : playerPayload.players || playerPayload.data || [];
const photoFiles = [
  'lib/player-photo-manifest.json',
  'lib/player-photo-refresh.json',
  'lib/player-photo-additions.json',
  'lib/player-directory-photo-manifest.json',
  manifestFile,
];
const knownNames = new Set();
for (const file of photoFiles) {
  const entries = await readJson(file, {});
  for (const name of Object.keys(entries)) knownNames.add(normalize(name));
}
const candidates = [...players]
  .sort((a, b) => (b.grandSlamFinalsWon || 0) - (a.grandSlamFinalsWon || 0)
    || (b.wins || 0) - (a.wins || 0)
    || a.name.localeCompare(b.name, 'es'))
  .filter(player => !knownNames.has(normalize(player.name)))
  .slice(0, scanLimit);

const discovered = await readJson(manifestFile, {});
const sources = await readJson(sourcesFile, []);
const sourceNames = new Set(sources.map(item => normalize(item.name)));
await fs.mkdir(outputDirectory, { recursive: true });

let accepted = 0;
const sparql = `SELECT ?item ?itemLabel (SAMPLE(?image) AS ?image) WHERE {
  ?item wdt:P106 wd:Q10833314; wdt:P18 ?image; rdfs:label ?itemLabel.
  FILTER(LANG(?itemLabel) = "en")
} GROUP BY ?item ?itemLabel`;
const rosterResponse = await fetch(`${wikidataQuery}?${new URLSearchParams({ query: sparql, format: 'json' })}`, {
  headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(45_000),
});
if (!rosterResponse.ok) throw new Error(`Wikidata Query Service: HTTP ${rosterResponse.status}`);
const rosterPayload = await rosterResponse.json();
const roster = new Map(rosterPayload.results.bindings.map(row => [normalize(row.itemLabel.value), {
  id: row.item.value.split('/').at(-1),
  title: decodeURIComponent(new URL(row.image.value).pathname.split('/').at(-1)),
}]));
const matched = candidates.map((player, index) => ({ player, index, entity: roster.get(normalize(player.name)) }))
  .filter(entry => entry.entity);

const commonsPages = new Map();
for (let offset = 0; offset < matched.length; offset += 40) {
  const batch = matched.slice(offset, offset + 40);
  const commons = await json(commonsApi, {
    action: 'query', titles: batch.map(entry => `File:${entry.entity.title}`).join('|'), prop: 'imageinfo',
    iiprop: 'url|mime|extmetadata', iiurlwidth: '1280', iiextmetadatalanguage: 'en',
  });
  for (const page of Object.values(commons.query?.pages || {})) commonsPages.set(normalize(page.title.replace(/^File:/, '')), page);
}

for (const { player, index, entity } of matched) {
  if (accepted >= photoLimit) break;
  const page = commonsPages.get(normalize(entity.title));
  const info = page?.imageinfo?.[0];
  const metadata = info?.extmetadata || {};
  const license = text(metadata.LicenseShortName?.value);
  const licenseUrl = metadata.LicenseUrl?.value || '';
  const author = text(metadata.Artist?.value || metadata.Credit?.value);
  const reusable = /^(CC BY(?:-SA)?(?: |$)|CC0$|Public domain$)/i.test(license)
    && (/creativecommons\.org\//.test(licenseUrl) || /publicdomain/i.test(license));
  if (!info?.thumburl || !String(info.mime || '').startsWith('image/') || !reusable || !author) {
    console.log(`[${index + 1}/${candidates.length}] unusable licence or format: ${player.name}`);
    await sleep(80);
    continue;
  }

  const output = path.join(outputDirectory, `${slug(player.name)}.webp`);
  if (!dryRun) {
    let exists = true;
    try { await fs.access(output); } catch { exists = false; }
    if (!exists) {
      let response;
      for (const imageUrl of [...new Set([info.thumburl, info.url].filter(Boolean))]) {
        response = await fetch(imageUrl, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(45_000) });
        if (response.ok) break;
        if (response.status !== 429 && response.status < 500) break;
        await sleep(1_200);
      }
      if (!response?.ok) {
        console.log(`[${index + 1}/${candidates.length}] image unavailable: ${player.name} · HTTP ${response?.status || 'network'}`);
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const dimensions = await sharp(buffer).metadata();
      if ((dimensions.width || 0) < 240 || (dimensions.height || 0) < 240) {
        console.log(`[${index + 1}/${candidates.length}] source too small: ${player.name}`);
        continue;
      }
      await sharp(buffer).rotate().resize({ width: 960, height: 1280, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 84 }).toFile(output);
    }
  }
  const source = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(page.title.replace(/^File:/, '')).replace(/%20/g, '_')}`;
  discovered[player.name] = {
    src: output.replace(/^public/, ''),
    alt: `${player.name}, tenista`,
    credit: `${author} · ${license} · adaptación WebP por DEUCE`,
    source,
    licenseUrl: licenseUrl || source,
    objectPosition: '50% 28%',
    mobileObjectPosition: '50% 24%',
  };
  if (!sourceNames.has(normalize(player.name))) {
    sources.push({ name: player.name, wikidataId: entity.id, title: page.title, author, license, licenseUrl, source });
    sourceNames.add(normalize(player.name));
  }
  accepted += 1;
  console.log(`[${index + 1}/${candidates.length}] added ${player.name} · ${license}`);
  if (!dryRun) {
    await fs.writeFile(manifestFile, `${JSON.stringify(discovered, null, 2)}\n`);
    await fs.writeFile(sourcesFile, `${JSON.stringify(sources, null, 2)}\n`);
  }
  await sleep(180);
}

if (!dryRun) {
  await fs.writeFile(manifestFile, `${JSON.stringify(discovered, null, 2)}\n`);
  await fs.writeFile(sourcesFile, `${JSON.stringify(sources, null, 2)}\n`);
}
console.log(`${dryRun ? 'Would add' : 'Added'} ${accepted} verified photos after scanning ${Math.min(candidates.length, scanLimit)} missing players.`);
