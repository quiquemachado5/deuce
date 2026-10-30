import "server-only";
import { cache } from "react";
import { preparedPlayerArchive } from "../revista/read-records";
import { playerDirectory, playerSlug, rivalryDirectory, type PlayerSummary } from "../explore";
import { asyncCache } from "../async-cache";
import { canonicalName } from "../quality";
async function load(archive: Awaited<ReturnType<typeof preparedPlayerArchive>>) {
  const {matches,records} = archive;
  let players: ReturnType<typeof playerDirectory> | undefined;
  let pairs: ReturnType<typeof rivalryDirectory> | undefined;
  return {
    matches,
    records,
    manifest: archive.manifest,
    source: archive.source,
    fallbackReason: archive.fallbackReason,
    get players() { return players ?? (players = playerDirectory(matches)); },
    get pairs() { return pairs ?? (pairs = rivalryDirectory(matches)); },
  };
}
const cached = asyncCache<Awaited<ReturnType<typeof load>>>(300_000, 1);
export const notebook = cache(async () => {
  const archive = await preparedPlayerArchive();
  return cached(`${archive.manifest.version}:${archive.source}:${archive.fallbackReason || ''}`, () => load(archive));
});

type PlayerNotebook = Awaited<ReturnType<typeof preparedPlayerArchive>> & {
  player: PlayerSummary;
  record: Awaited<ReturnType<typeof preparedPlayerArchive>>['records'][number];
};

const cachedPlayers = asyncCache<PlayerNotebook | null>(300_000, 32);

/** Build only the requested career instead of materialising every player. */
export const playerNotebook = cache(async (rawSlug: string, tour: 'atp' | 'wta' = 'atp') => {
  const archive = await preparedPlayerArchive();
  const requestedSlug = playerSlug(canonicalName(rawSlug.replace(/-/g, ' ')));
  const cacheKey = `${archive.manifest.version}:${archive.source}:${archive.fallbackReason || ''}:${tour}:${requestedSlug}`;
  return cachedPlayers(cacheKey, async () => {
    const record = archive.records.find(entry => (entry.tour || 'atp') === tour && playerSlug(entry.name) === requestedSlug);
    if (!record) return null;
    const player: PlayerSummary = {
      name: record.name,
      tour,
      played: 0,
      won: 0,
      bySurface: {
        hard: { played: 0, won: 0 },
        clay: { played: 0, won: 0 },
        grass: { played: 0, won: 0 },
        carpet: { played: 0, won: 0 },
        unknown: { played: 0, won: 0 },
      },
      matches: [],
    };
    for (const match of archive.matches) {
      if ((match.tour || 'atp') !== tour) continue;
      const side = match.player1.name === record.name ? 1 : match.player2.name === record.name ? 2 : null;
      if (!side || !match.winner) continue;
      player.played++;
      player.won += Number(match.winner === side);
      player.bySurface[match.surface].played++;
      player.bySurface[match.surface].won += Number(match.winner === side);
      player.matches.push(match);
    }
    return player.matches.length ? { ...archive, player, record } : null;
  });
});
