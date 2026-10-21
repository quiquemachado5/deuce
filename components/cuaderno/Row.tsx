import Link from "next/link";
import type { Match } from "@/lib/types";
import { tournamentName } from "@/lib/labels";
import { round, score, sentence } from "@/lib/cuaderno/model";
export default function Row({ match }: { match: Match }) {
  const text = sentence(match) || match.editorial_highlight;
  return (
    <Link className="row" href={`/match/${match.match_id}`}>
      <span className="row-meta">
        {tournamentName(match.tournament)} · {match.year} · {round(match)}
        {match.category.startsWith("Precursores") && " · Precursor"}
      </span>
      <span className="row-names">
        <span className={match.winner === 1 ? "row-name" : ""}>
          {match.player1.name}
        </span>
        <span className="versus"> contra </span>
        <span className={match.winner === 2 ? "row-name" : ""}>
          {match.player2.name}
        </span>
        <span className="sr-only">
          . Ganador:{" "}
          {match.winner === 1 ? match.player1.name : match.player2.name}.
        </span>
        {text && <span className="row-story">{text}</span>}
      </span>
      <span className="row-score">{score(match)}</span>
    </Link>
  );
}
export function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="figure-number">{value}</div>
      <p className="figure-label">{label}</p>
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
  href: (p: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / 25));
  return (
    <nav className="pagination" aria-label="Páginas de resultados">
      {page > 1 && <Link href={href(page - 1)}>Anterior</Link>}
      <span>
        Página {page} de {pages.toLocaleString("es-ES")}
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
