import "server-only";
import { cache } from "react";
import { preparedPlayerArchive } from "../revista/read-records";
import { playerDirectory, rivalryDirectory } from "../explore";
import { asyncCache } from "../async-cache";
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
