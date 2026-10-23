import type { Match } from "@/lib/types";
import SetScoreboard from "./SetScoreboard";
export default function HomeFinalScore({ match }: { match: Match; context?: string }) {
  return <SetScoreboard match={match} compact />;
}
