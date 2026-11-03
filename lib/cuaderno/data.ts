import "server-only";
import { cache } from "react";
import { preparedPlayerArchive, preparedPlayerSummaryArchive } from "../revista/read-records";
import { playerDirectory, playerSlug, rivalryDirectory, type PlayerSummary } from "../explore";
import { asyncCache } from "../async-cache";
import { canonicalName } from "../quality";
import { selectPlayerCareer } from "../player-career";
type PlayerArchive = Awaited<ReturnType<typeof preparedPlayerArchive>>;
async function load(archive: PlayerArchive) {
  const {matches,records} = archive;
  let players: ReturnType<typeof playerDirectory> | undefined;
  let pairs: ReturnType<typeof rivalryDirectory> | undefined;
  let matchesByTour: { atp: typeof matches; wta: typeof matches } | undefined;
  return {
    matches,
    records,
    manifest: archive.manifest,
    source: archive.source,
    fallbackReason: archive.fallbackReason,
    get players() { return players ?? (players = playerDirectory(matches)); },
    get pairs() { return pairs ?? (pairs = rivalryDirectory(matches)); },
    get matchesByTour() {
      return matchesByTour ?? (matchesByTour = {
        atp: matches.filter(match => (match.tour || 'atp') === 'atp'),
        wta: matches.filter(match => match.tour === 'wta'),
      });
    },
  };
}
const VERSIONED_CACHE_MS = 3_600_000;
const cached = asyncCache<Awaited<ReturnType<typeof load>>>(VERSIONED_CACHE_MS, 1);
export const notebook = cache(async () => {
  const archive = await preparedPlayerArchive();
  return cached(`${archive.manifest.version}:${archive.source}:${archive.fallbackReason || ''}`, () => load(archive));
});

const cachedSummary = asyncCache<Awaited<ReturnType<typeof load>>>(VERSIONED_CACHE_MS, 1);
export const summaryNotebook = cache(async () => {
  const archive = await preparedPlayerSummaryArchive();
  return cachedSummary(`${archive.manifest.version}:${archive.source}:${archive.fallbackReason || ''}`, () => load(archive));
});

type PlayerNotebook = Awaited<ReturnType<typeof preparedPlayerSummaryArchive>> & {
  player: PlayerSummary;
  record: Awaited<ReturnType<typeof preparedPlayerSummaryArchive>>['records'][number];
};

const cachedPlayers = asyncCache<PlayerNotebook | null>(VERSIONED_CACHE_MS, 32);

/** Build only the requested career instead of materialising every player. */
export const playerNotebook = cache(async (rawSlug: string, tour: 'atp' | 'wta' = 'atp') => {
  const archive = await preparedPlayerSummaryArchive();
  const requestedSlug = playerSlug(canonicalName(rawSlug.replace(/-/g, ' ')));
  const cacheKey = `${archive.manifest.version}:${archive.source}:${archive.fallbackReason || ''}:${tour}:${requestedSlug}`;
  return cachedPlayers(cacheKey, async () => {
    const selected=selectPlayerCareer(archive.matches,archive.records,requestedSlug,tour);
    return selected?{...archive,...selected}:null;
  });
});
