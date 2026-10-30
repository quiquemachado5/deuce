// Import official WTA player portraits shown in the current player directory.
// Run with `node build/import-wta-player-photos.mjs --limit=50`.
import fs from 'node:fs/promises';
import sharp from 'sharp';

const manifestPath = 'lib/player-photo-wta.json';
const outputDirectory = 'public/images/players/wta';
const limit = Math.max(1, Number(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1]) || 50);
const hub = await (await fetch('https://www.wtatennis.com/players', { signal: AbortSignal.timeout(30_000) })).text();
const profiles = [...new Map([...hub.matchAll(/\/players\/(\d+)\/([a-z0-9-]+)/g)]
  .map(([, id, slug]) => [id, `https://www.wtatennis.com/players/${id}/${slug}`])).values()].slice(0, limit);
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
await fs.mkdir(outputDirectory, { recursive: true });
for (const [index, profile] of profiles.entries()) {
  try {
    const id = profile.match(/\/players\/(\d+)\//)?.[1];
    if (id && Object.values(manifest).some(photo => photo.src === `/images/players/wta/${id}.webp`)) {
      console.log(`[${index + 1}/${profiles.length}] already imported ${id}`);
      continue;
    }
    const response = await fetch(profile, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`profile HTTP ${response.status}`);
    const html = await response.text();
    const name = html.match(/<title[^>]*>([^<|]+)\s*\|/i)?.[1]?.trim();
    const image = html.match(/https:\/\/photoresources\.wtatennis\.com\/photo-resources\/[^"'\s<]+?Torso_[^"'\s<]+?\.png/i)?.[0];
    if (!name || !image) throw new Error('no named portrait');
    const source = image.replace(/&amp;/g, '&').split('?')[0];
    const imageResponse = await fetch(`${source}?width=950`, { signal: AbortSignal.timeout(30_000) });
    if (!imageResponse.ok) throw new Error(`image HTTP ${imageResponse.status}`);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    if ((metadata.width || 0) < 400 || (metadata.height || 0) < 400) throw new Error('portrait too small');
    const path = `${outputDirectory}/${id}.webp`;
    await sharp(buffer).rotate().webp({ quality: 84 }).toFile(path);
    manifest[name] = {
      src: `/${path.replace(/^public\//, '')}`,
      alt: `${name}, tenista`,
      credit: 'WTA · adaptación WebP por DEUCE',
      source: profile,
      objectPosition: '50% 20%',
      mobileObjectPosition: '50% 20%',
    };
    console.log(`[${index + 1}/${profiles.length}] ${name}`);
  } catch (error) {
    console.warn(`[${index + 1}/${profiles.length}] ${profile}: ${error instanceof Error ? error.message : 'failed'}`);
  }
}
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${Object.keys(manifest).length} WTA portraits in manifest`);
