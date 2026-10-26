import type { Match } from '@/lib/types';
import { toMatchRecord } from '@/data/map-match';
import { MatchScoreboard } from './deuce/MatchScoreboard';
export default function TournamentFinal({match,latest=false}:{match:Match;latest?:boolean}) {
  return <section className="deuce-tournament-final" aria-label={latest?'Última final':'Final'}><h2>{latest?'Última final':'Final'} · {match.year}</h2><MatchScoreboard match={toMatchRecord(match)}/></section>;
}
