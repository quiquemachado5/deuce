import Link from "next/link";
import { displaySetClosed, displayTotal } from "@/lib/score-display";
import type { CSSProperties } from "react";
import PlayerAvatar from "@/components/PlayerAvatar";
import type { Match } from "@/lib/types";
import { tournamentName } from "@/lib/labels";
import { round, score, number } from "@/lib/cuaderno/model";
import { tournamentCourt } from "@/lib/tournament-presentation";
import MatchStatusBadge from "@/components/MatchStatusBadge";
export default function MatchRow({
  match,
  firstPlayer,
  grouped = false,
  href,
}: {
  match: Match;
  firstPlayer?: string;
  grouped?: boolean;
  href?: string;
}) {
  const court = tournamentCourt(match);
  const winner = match.winner === 1 ? match.player1.name : match.winner === 2 ? match.player2.name : "";
  const leadingPlayer = firstPlayer || winner || match.player1.name;
  const reversed = leadingPlayer === match.player2.name,
    players = reversed
      ? [match.player2, match.player1]
      : [match.player1, match.player2];
  const games = reversed
    ? match.score_summary.games.map(([a, b]) => [b, a])
    : match.score_summary.games;
  const tieBreaks = score(match)
    .split(", ")
    .map((token) => token.match(/\((\d+)\)/)?.[1]);
  const result = reversed
    ? games
        .map(
          ([left, right], index) =>
            `${left}–${right}${tieBreaks[index] ? `(${tieBreaks[index]})` : ""}`,
        )
        .join(", ")
    : score(match);
  const columns = Array.from({ length: 5 }, (_, index) => index);
  const context = `${tournamentName(match.tournament)} · ${match.year} · ${round(match)}`;
  return (
    <Link
      href={href || `/match/${match.match_id}`}
      className={`nc-match-row${grouped ? " nc-row-grouped" : ""}`}
      data-event-surface={court.surface}
      data-event-category={match.category}
      aria-label={`${context}. ${players[0].name} contra ${players[1].name}. ${result}. Ganador: ${winner}`}
    >
      <span className="nc-row-context">
        <span>
          <i className={`nc-dot nc-dot-${court.surface}`} aria-hidden="true" />
          {tournamentName(match.tournament)} · {match.year}
        </span>
        <MatchStatusBadge status={match.status} />
        <span className="nc-row-round">
          {round(match)}
          {/retired|abandoned/i.test(match.status)
            ? " · Abandono"
            : /walkover|cancelled/i.test(match.status)
              ? " · Sin jugar"
              : ""}
          {match.category.startsWith("Precursores") ? " · Precursor" : ""}
        </span>
      </span>
      <span className="nc-row-duel">
        {players.map((player) => (
          <span
            key={player.name}
            className={`nc-row-person ${player.name === winner ? "nc-row-winner" : "nc-row-loser"}`}
          >
            <PlayerAvatar name={player.name} size={28} />
            <span>{player.name}</span>
          </span>
        ))}
      </span>
      <span
        className="nc-row-result"
        aria-hidden="true"
        style={{ "--score-count": 5 } as CSSProperties}
      >
        <span className="row-score-line row-score-labels">
          {columns.map((i) => (
            <span key={i}>{i + 1}</span>
          ))}
          <span>Total</span>
        </span>
        {players.map((player, side) => (
          <span
            className="row-score-line"
            key={player.name}
            data-winner={player.name === winner}
          >
            {columns.map((i) => {
              const set = games[i];
              if (!set) return <span className="row-score-empty" aria-hidden="true" key={i}>—</span>;
              const won =
                displaySetClosed(match, i) && set[side] > set[1 - side];
              return (
                <span key={i} data-won={won}>
                  {set[side]}
                  {set[side] < set[1 - side] && tieBreaks[i] && (
                    <small>({tieBreaks[i]})</small>
                  )}
                </span>
              );
            })}
            <strong className="row-score-total">
              {displayTotal(match, reversed ? 1 - side : side)}
            </strong>
          </span>
        ))}
      </span>
    </Link>
  );
}
export function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="nc-number">{value}</p>
      <p className="nc-number-label">{label}</p>
    </div>
  );
}
export function Pagination({
  page,
  total,
  href,
}: {
  page: number;
  total: number;
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / 25));
  if (pages <= 1) return null;
  const numbered = [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pages])]
    .filter((value) => value >= 1 && value <= pages)
    .sort((a, b) => a - b);
  return (
    <nav className="nc-pagination" aria-label="Páginas de resultados">
      {page > 1 && <Link href={href(page - 1)}>Anterior</Link>}
      <span className="nc-pagination-pages">
        {numbered.map((value, index) => <span key={value}>
          {index > 0 && value - numbered[index - 1] > 1 && <span className="nc-pagination-gap" aria-hidden="true">…</span>}
          {value === page ? <strong aria-current="page" aria-label={`Página ${value}, actual`}>{number(value)}</strong> : <Link href={href(value)} aria-label={`Ir a la página ${value}`}>{number(value)}</Link>}
        </span>)}
      </span>
      {page < pages && <Link href={href(page + 1)}>Siguiente</Link>}
    </nav>
  );
}
