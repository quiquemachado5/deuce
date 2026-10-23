import Link from "next/link";
import { displaySetClosed, tieBreakPoints } from "@/lib/score-display";
import type { CSSProperties } from "react";
import type { Match } from "@/lib/types";
import { playerSlug } from "@/lib/explore";
import { score } from "@/lib/cuaderno/model";
import PlayerCountryFlag from "@/components/PlayerCountryFlag";
import SetGame from "@/components/SetGame";
import { displayPlayerName } from "@/lib/labels";

/** One score layout for home, match, tournament and comparison. */
export default function SetScoreboard({
  match,
  compact = false,
}: {
  match: Match;
  compact?: boolean;
}) {
  const sets = match.score_summary.games;
  const tieBreaks = tieBreakPoints(match);
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
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Jugador</th>
            {sets.map((_, i) => (
              <th scope="col" key={i}>
                Set {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[match.player1, match.player2].map((player, side) => {
            const winner = finished && match.winner === side + 1;
            return (
              <tr key={player.name} data-winner={winner}>
                <th scope="row">
                  <PlayerCountryFlag name={player.name} />
                  <Link href={`/players/${playerSlug(player.name)}`}>
                    {displayPlayerName(player.name)}
                  </Link>
                  {winner && <span className="set-winner-label">Ganador</span>}
                </th>
                {sets.map((set, i) => {
                  const won =
                    displaySetClosed(match, i) && set[side] > set[1 - side];
                  const tie = !won ? tieBreaks[i] : undefined;
                  return (
                    <td key={i} data-set-won={won}>
                      <SetGame games={set[side]} tieBreak={tie} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
