import Link from "next/link";
import { displaySetClosed, displayTotal } from "@/lib/score-display";
import type { CSSProperties } from "react";
import type { Match } from "@/lib/types";
import { playerSlug } from "@/lib/explore";
import { score } from "@/lib/cuaderno/model";

/** One score layout for home, match, tournament and comparison. */
export default function SetScoreboard({
  match,
  compact = false,
}: {
  match: Match;
  compact?: boolean;
}) {
  const sets = match.score_summary.games;
  const tokens = score(match).split(", ");
  const finished =
    match.winner !== null &&
    (match.quality?.result !== "review" ||
      /retired|abandoned|walkover|cancelled/i.test(match.status));
  return (
    <div
      className={`set-scoreboard${compact ? " set-scoreboard-compact" : ""}`}
      role={compact ? "group" : "region"}
      aria-label="Marcador por sets"
      tabIndex={0}
    >
      <table style={{ "--set-columns": sets.length } as CSSProperties}>
        <caption className="nc-sr">
          {match.player1.name} contra {match.player2.name}. {score(match)}.
        </caption>
        <colgroup>
          <col className="set-player-column" />
          {sets.map((_, i) => (
            <col key={i} />
          ))}
          <col />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Jugador</th>
            {sets.map((_, i) => (
              <th scope="col" key={i}>
                Set {i + 1}
              </th>
            ))}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {[match.player1, match.player2].map((player, side) => {
            const winner = finished && match.winner === side + 1;
            return (
              <tr key={player.name} data-winner={winner}>
                <th scope="row">
                  <Link href={`/players/${playerSlug(player.name)}`}>
                    {player.name}
                  </Link>
                  {winner && <span className="nc-sr"> · Ganador</span>}
                </th>
                {sets.map((set, i) => {
                  const won =
                    displaySetClosed(match, i) && set[side] > set[1 - side];
                  const tie = !won && tokens[i]?.match(/\((\d+)\)/)?.[1];
                  return (
                    <td key={i} data-set-won={won}>
                      <span className="set-game">
                        {set[side]}
                        {tie && <span className="set-tie">({tie})</span>}
                      </span>
                    </td>
                  );
                })}
                <td className="set-total">
                  <strong>{displayTotal(match, side)}</strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
