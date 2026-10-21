import Link from "next/link";
import PlayerAvatar from "./PlayerAvatar";
import { score } from "@/lib/cuaderno/model";
import type { Match } from "@/lib/types";

export default function TournamentFinal({
  match,
  latest = false,
}: {
  match: Match;
  latest?: boolean;
}) {
  const games = match.score_summary.games;
  const formatted = score(match).split(", ");
  return (
    <section
      className="td-final"
      aria-label={`${latest ? "Última final registrada" : "Final"} · ${match.year}`}
    >
      <div className="td-final-heading">
        <p className="td-final-label">
          {latest ? "Última final registrada" : "Final"} · {match.year}
        </p>
        <Link href={`/match/${match.match_id}`}>Ver partido </Link>
      </div>
      <div className="td-final-table" role="region" aria-label="Marcador de la final por sets" tabIndex={0}>
        <table>
          <caption className="nc-sr">
            {match.player1.name} contra {match.player2.name}. Marcador desde{" "}
            {match.player1.name}: {score(match)}.
          </caption>
          <thead>
            <tr>
              <th scope="col">Finalistas</th>
              {games.map((_, index) => (
                <th scope="col" key={index}>
                  S{index + 1}
                </th>
              ))}
              <th scope="col">Sets</th>
            </tr>
          </thead>
          <tbody>
            {[match.player1, match.player2].map((player, index) => (
              <tr key={player.name} data-winner={match.winner === index + 1}>
                <th scope="row">
                  <span className="td-final-person">
                    <PlayerAvatar name={player.name} size={48} />
                    <span>
                      {player.name}
                      {match.winner === index + 1 && <small>Campeón</small>}
                    </span>
                  </span>
                </th>
                {games.map((set, setIndex) => (
                  <td key={setIndex} data-won={set[index] > set[1 - index]}>
                    {set[index]}
                    {set[index] < set[1 - index] &&
                      formatted[setIndex]?.match(/\((\d+)\)/) && (
                        <span className="score-tiebreak">
                          ({formatted[setIndex].match(/\((\d+)\)/)![1]})
                        </span>
                      )}
                  </td>
                ))}
                <td className="td-final-total">
                  {games.filter((set) => set[index] > set[1 - index]).length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
