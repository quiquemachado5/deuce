import "server-only";
import { cache } from "react";
import { preparedPlayerArchive } from "../revista/read-records";
import { playerDirectory, rivalryDirectory } from "../explore";
import { asyncCache } from "../async-cache";
async function load() {
  const {matches,records} = await preparedPlayerArchive();
  let players: ReturnType<typeof playerDirectory> | undefined;
  let pairs: ReturnType<typeof rivalryDirectory> | undefined;
  return {
    matches,
    records,
    get players() { return players ?? (players = playerDirectory(matches)); },
    get pairs() { return pairs ?? (pairs = rivalryDirectory(matches)); },
  };
}
const cached = asyncCache<Awaited<ReturnType<typeof load>>>(300_000, 1);
export const notebook = cache(() => cached("cuaderno", load));
