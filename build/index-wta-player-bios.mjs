// Rebuild WTA biography fallbacks from downloaded provider rows, oldest first.
// Missing fields never overwrite verified values. No API quota is consumed.
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
const directory = 'data/archive/wta';
const target = 'lib/wta-player-bio.json';
const bios = JSON.parse(await fs.readFile(target, 'utf8'));
const files = (await fs.readdir(directory)).filter(file => file.endsWith('.json.gz'))
  .sort((a,b) => Number(a.match(/\d{4}/)?.[0]) - Number(b.match(/\d{4}/)?.[0]) || a.localeCompare(b));
for (const file of files) {
  const payload = JSON.parse(gunzipSync(await fs.readFile(`${directory}/${file}`)));
  for (const row of Array.isArray(payload) ? payload : payload.data || []) {
    for (const player of [row.players?.p1,row.players?.p2,row.winner,row.loser]) {
      if (!player || typeof player.name !== 'string' || player.is_doubles_team) continue;
      const fresh = {};
      if (typeof player.country === 'string' && /^[a-z]{3}$/i.test(player.country)) fresh.country = player.country.toLowerCase();
      if (typeof player.birthday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(player.birthday) && Number.isFinite(Date.parse(player.birthday))) fresh.birthday = player.birthday;
      if (['L','R'].includes(player.hand)) fresh.hand = player.hand;
      if (Object.keys(fresh).length) bios[player.name] = {...bios[player.name], ...fresh};
    }
  }
}
const normalize = name => name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const players = JSON.parse(gunzipSync(await fs.readFile('data/reading/players.json.gz')));
const publishedNames = new Set(players.filter(player=>player.tour==='wta').map(player=>normalize(player.name)));
for (const name of Object.keys(bios)) if (!publishedNames.has(normalize(name))) delete bios[name];
await fs.writeFile(target, JSON.stringify(Object.fromEntries(Object.entries(bios).sort(([a],[b])=>a.localeCompare(b))),null,2)+'\n');
console.log(`WTA: ${Object.keys(bios).length} biographies, ${Object.values(bios).filter(bio=>bio.country).length} countries`);
