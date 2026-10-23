import { toMatchRecord } from '@/data/map-match';
import { MatchScoreboard } from './deuce/MatchScoreboard';
import TournamentRounds from "./TournamentRounds";
import { roundLabel, roundPosition, winnerName } from "@/lib/editorial";
import { number } from "@/lib/cuaderno/model";
import type { Match } from "@/lib/types";

export default function TournamentBracket({ matches }: { matches: Match[] }) {
  const final = matches.find((match) => roundPosition(match.round) === 7 && match.winner);
  const champion = final ? winnerName(final) : null;
  const groups = new Map<number, Match[]>();
  for (const match of matches) {
    const position = roundPosition(match.round);
    if (!position) continue;
    groups.set(position, [...(groups.get(position) || []), match]);
  }
  const rounds = [...groups].sort(([a], [b]) => a - b).map(([position, results]) => ({
    key: String(position),
    label: roundLabel(results[0].round),
    count: results.length,
    content: <ol className="td-bracket-results">
      {results.map((match) => {
        const onPath = champion !== null && winnerName(match) === champion;
        return <li key={match.match_id} data-champion-path={onPath}>
          <MatchScoreboard match={toMatchRecord(match)} />
          {onPath&&<span className="deuce-bracket-path">Camino del campeón</span>}
        </li>;
      })}
    </ol>,
  }));
  if (!rounds.length) return null;
  const initialRound = rounds.find((round) => Number(round.key) >= 5)?.key || rounds.at(-1)!.key;
  return <section className="nc-section td-bracket" aria-labelledby="td-bracket-title">
    <div className="td-section-heading"><div><h2 id="td-bracket-title">Cuadro registrado</h2></div>
      <span>{number(rounds.reduce((total, round) => total + round.count, 0))} partidos{champion ? " · camino del campeón destacado" : ""}</span></div>
    <p className="td-bracket-note">Solo aparecen los resultados disponibles. El orden de los partidos no reproduce las posiciones del sorteo.</p>
    <TournamentRounds rounds={rounds} initialRound={initialRound} />
  </section>;
}
