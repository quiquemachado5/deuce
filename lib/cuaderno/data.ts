import "server-only";
import { cache } from "react";
import { preparedCompactSelection, preparedPlayerRecords, preparedPlayerSummaryArchive } from "../revista/read-records";
import { playerDirectory, playerSlug, rivalryDirectory, type PlayerSummary } from "../explore";
import { asyncCache } from "../async-cache";
import { canonicalName } from "../quality";
import { selectPlayerCareer } from "../player-career";
type PlayerArchive = Awaited<ReturnType<typeof preparedPlayerSummaryArchive>>;
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
  const archive = await preparedPlayerSummaryArchive();
  return cached(`${archive.manifest.version}:${archive.source}:${archive.fallbackReason || ''}`, () => load(archive));
});

const cachedSummary = asyncCache<Awaited<ReturnType<typeof load>>>(VERSIONED_CACHE_MS, 1);
export const summaryNotebook = cache(async () => {
  const archive = await preparedPlayerSummaryArchive();
  return cachedSummary(`${archive.manifest.version}:${archive.source}:${archive.fallbackReason || ''}`, () => load(archive));
});

type PlayerNotebook = Awaited<ReturnType<typeof preparedPlayerRecords>> & {
  matches: Awaited<ReturnType<typeof preparedCompactSelection>>;
  player: PlayerSummary;
  record: Awaited<ReturnType<typeof preparedPlayerRecords>>['records'][number];
};

const cachedPlayers = asyncCache<PlayerNotebook | null>(VERSIONED_CACHE_MS, 32);

/** Build only the requested career instead of materialising every player. */
export const playerNotebook = cache(async (rawSlug: string, tour: 'atp' | 'wta' = 'atp') => {
  const archive = await preparedPlayerRecords();
  const requestedSlug = playerSlug(canonicalName(rawSlug.replace(/-/g, ' ')));
  const cacheKey = `${archive.manifest.version}:${archive.source}:${archive.fallbackReason || ''}:${tour}:${requestedSlug}`;
  return cachedPlayers(cacheKey, async () => {
    const record=archive.records.find(candidate=>(candidate.tour||'atp')===tour&&playerSlug(canonicalName(candidate.name))===requestedSlug);
    if(!record)return null;
    const matches=await preparedCompactSelection({tour,players:[record.name]});
    const selected=selectPlayerCareer(matches,archive.records,requestedSlug,tour);
    return selected?{...archive,matches,...selected}:null;
  });
});
