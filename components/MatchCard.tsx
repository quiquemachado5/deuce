import Link from "next/link";
import type { CSSProperties } from "react";
import { round, score } from "@/lib/cuaderno/model";
import { displaySetClosed, tieBreakPoints } from "@/lib/score-display";
import { tournamentName } from "@/lib/labels";
import { tournamentCourt } from "@/lib/tournament-presentation";
import type { Match } from "@/lib/types";
import PlayerCountryFlag from "@/components/PlayerCountryFlag";
import SetGame from "@/components/SetGame";

export default function MatchCard({ match }: { match: Match }) {
  const court = tournamentCourt(match);
  const sets = match.score_summary.games;
  const tieBreaks = tieBreakPoints(match);
  const winner = match.winner === 1 ? match.player1.name : match.winner === 2 ? match.player2.name : "";
  const context = `${tournamentName(match.tournament)} · ${match.year} · ${round(match)} · ${match.category}`;

  return (
    <Link
      className="match-card"
      data-event-surface={court.surface}
      href={`/match/${match.match_id}`}
      aria-label={`${context}. ${match.player1.name} contra ${match.player2.name}. ${score(match)}${winner ? `. Ganador: ${winner}` : ""}`}
    >
      <span className="match-card-meta">
        <span>{context}</span>
      </span>

      <span
        className="match-card-score"
        style={{ "--match-set-count": Math.max(sets.length, 1) } as CSSProperties}
        aria-hidden="true"
      >
        {sets.length > 0 ? (
          <span className="match-card-score-head">
            <span />
            {sets.map((_, setIndex) => <span key={setIndex} aria-label={`Set ${setIndex + 1}`}>{setIndex + 1}</span>)}
          </span>
        ) : null}

        {[match.player1, match.player2].map((player, side) => {
          const playerWon = player.name === winner;
          return (
            <span className="match-card-player" data-winner={playerWon} key={player.name}>
              <span className="match-card-identity">
                <PlayerCountryFlag name={player.name} />
                <span className="match-card-name">{player.name}</span>
                {playerWon ? <i className="match-card-winner" title="Ganador"><span className="nc-sr">Ganador</span></i> : null}
              </span>
              {sets.map((set, setIndex) => {
                const won = displaySetClosed(match, setIndex) && set[side] > set[1 - side];
                const tieBreak = !won ? tieBreaks[setIndex] : undefined;
                return (
                  <strong data-set-won={won} key={setIndex}><SetGame games={set[side]} tieBreak={tieBreak} /></strong>
                );
              })}
            </span>
          );
        })}

        {sets.length === 0 ? <span className="match-card-no-sets">Sin sets disputados</span> : null}
      </span>
    </Link>
  );
}
