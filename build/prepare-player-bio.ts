import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { collectPlayerBios, mergeBio, type PlayerBio } from '../lib/player-bio';

async function main() {
  const directory = join(process.cwd(), 'data', 'archive', 'lists');
  const files = (await readdir(directory)).filter((name) => /^modern-\d{4}-\d+\.json\.gz$/.test(name)).sort();
  if (!files.length) throw new Error('No se encontraron listas recientes para las fichas de jugadores');
  const people: Record<string, PlayerBio> = {};
  for (const filename of files) {
    const page = JSON.parse(gunzipSync(await readFile(join(directory, filename))).toString()) as { data?: unknown };
    if (!Array.isArray(page.data)) continue;
    for (const [key, bio] of Object.entries(collectPlayerBios(page.data))) people[key] = mergeBio(people[key], bio)!;
  }
  await writeFile(join(process.cwd(), 'lib', 'player-bio-index.json'), `${JSON.stringify(Object.fromEntries(Object.entries(people).sort(([a], [b]) => a.localeCompare(b))))}\n`);
  console.log(`Fichas de jugadores preparadas: ${Object.keys(people).length}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : 'No se pudo preparar la biografía'); process.exitCode = 1; });
