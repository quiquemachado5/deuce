import Link from "next/link";
import ScoreText from '@/components/ScoreText';
import PlayerAvatar from '@/components/PlayerAvatar';
import type { Match } from "@/lib/types";
import { tournamentName } from "@/lib/labels";
import { round, score, number } from "@/lib/cuaderno/model";
export default function MatchRow({
  match,
  firstPlayer,
}: {
  match: Match;
  firstPlayer?: string;
}) {
  const reversed = firstPlayer === match.player2.name,
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
        .map(([left, right], index) =>
          `${left}–${right}${tieBreaks[index] ? `(${tieBreaks[index]})` : ""}`,
        )
        .join(", ")
    : score(match);
  const winner = match.winner === 1 ? match.player1.name : match.player2.name;
  const context = `${tournamentName(match.tournament)} · ${match.year} · ${round(match)}`;
  return (
    <Link
      href={`/match/${match.match_id}`}
      className="nc-match-row"
      data-event-surface={match.surface}
      data-event-category={match.category}
      aria-label={`${context}. ${players[0].name} contra ${players[1].name}. ${result}. Ganador: ${winner}`}
    >
      <span className="nc-row-context">
        <i className={`nc-dot nc-dot-${match.surface}`} aria-hidden="true" />
        {tournamentName(match.tournament)} · {match.year}
        <span className="nc-row-round"> · {round(match)}{match.category.startsWith("Precursores") ? " · Precursor" : ""}</span>
      </span>
      <span className="nc-row-duel">
        <span className={`nc-row-person ${players[0].name === winner ? "nc-row-winner" : "nc-row-loser"}`}><PlayerAvatar name={players[0].name} size={28} />{players[0].name}</span>
        <span className="nc-row-contra">contra</span>
        <span className={`nc-row-person ${players[1].name === winner ? "nc-row-winner" : "nc-row-loser"}`}><PlayerAvatar name={players[1].name} size={28} />{players[1].name}</span>
      </span>
      <span className="nc-row-result" title={result}><ScoreText value={result}/></span>
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
  return (
    <nav className="nc-pagination" aria-label="Páginas de resultados">
      {page > 1 && <Link href={href(page - 1)}>Anterior</Link>}
      <span>
        Página {number(page)} de {number(pages)}
      </span>
      {page < pages && (
        <>
          <Link href={href(page + 1)}>Siguiente</Link>
          <Link href={href(pages)}>Última</Link>
        </>
      )}
    </nav>
  );
}
