import type { Match } from "@/lib/types";
import SetScoreboard from "./SetScoreboard";
import MatchStatusBadge from "./MatchStatusBadge";
export default function HomeFinalScore({ match }: { match: Match; context?: string }) {
  return <><MatchStatusBadge status={match.status} /><SetScoreboard match={match} compact /></>;
}
