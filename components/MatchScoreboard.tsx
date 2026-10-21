import type { Match } from "@/lib/types";
import SetScoreboard from "./SetScoreboard";
export default function MatchScoreboard({ match }: { match: Match; sets: number[][] }) {
  return <SetScoreboard match={match} />;
}
