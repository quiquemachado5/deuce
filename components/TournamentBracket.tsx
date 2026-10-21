import Link from "next/link";
import PlayerAvatar from "./PlayerAvatar";
import TournamentRounds from "./TournamentRounds";
import { roundLabel, roundPosition, winnerName } from "@/lib/editorial";
import { number, score } from "@/lib/cuaderno/model";
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
        return <li key={match.match_id}>
          <Link href={`/match/${match.match_id}`} className="td-bracket-match" data-champion-path={onPath}
            aria-label={`${roundLabel(match.round)}: ${match.player1.name} contra ${match.player2.name}, ${score(match)}${winnerName(match) ? `. Ganador: ${winnerName(match)}` : ""}`}>
            {[match.player1, match.player2].map((player, index) => <span className="td-bracket-player" key={player.name}
              data-winner={match.winner === index + 1}>
              <PlayerAvatar name={player.name} size={28} />
              <span>{player.name}{match.winner === index + 1 && <span className="nc-sr"> · Ganador</span>}</span>
              <span className="td-bracket-sets" aria-hidden="true">{match.score_summary.games.map((games, set) =>
                <b key={set} data-set-winner={games[index] > games[1 - index]}>{games[index]}</b>)}</span>
            </span>)}
            <span className="td-bracket-result">{onPath ? "Camino del campeón" : "Resultado"}<strong>{score(match)}</strong></span>
          </Link>
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
