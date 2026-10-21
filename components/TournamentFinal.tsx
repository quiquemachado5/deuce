import Link from "next/link";
import type { Match } from "@/lib/types";
import SetScoreboard from "./SetScoreboard";
export default function TournamentFinal({ match, latest = false }: { match: Match; latest?: boolean }) {
  return <section className="td-final" aria-label={`${latest ? "Última final registrada" : "Final"} · ${match.year}`}>
    <div className="td-final-heading"><p className="td-final-label">{latest ? "Última final" : "Final"} · {match.year}</p><Link href={`/match/${match.match_id}`}>Ver partido</Link></div>
    <SetScoreboard match={match} compact />
  </section>;
}
