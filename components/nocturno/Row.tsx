import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Match } from '@/lib/types';
import { number } from '@/lib/cuaderno/model';
import { toMatchRecord } from '@/data/map-match';
import { MatchScoreboard } from '@/components/deuce/MatchScoreboard';
export default function MatchRow({ match, firstPlayer, href }: { match: Match; firstPlayer?: string; grouped?: boolean; href?: string }) {
  const record = toMatchRecord(match);
  if (href) record.href = href;
  if (firstPlayer === match.player2.name) {
    record.players = [record.players[1], record.players[0]];
    record.winnerIndex = record.winnerIndex === undefined ? undefined : record.winnerIndex === 0 ? 1 : 0;
    record.sets = record.sets.map(set => ({...set, games:[set.games[1],set.games[0]], tieBreak:set.tieBreak ? [set.tieBreak[1],set.tieBreak[0]] : undefined}));
  }
  return <MatchScoreboard match={record} variant="compact" />;
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
  const numbered = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((value) => value >= 1 && value <= pages)
    .sort((a, b) => a - b);
  return (
    <nav className="nc-pagination" aria-label="Páginas de resultados">
      {page > 1 && <Link className="nc-pagination-direction" href={href(page - 1)} aria-label="Página anterior"><ChevronLeft size={17} aria-hidden="true"/><span>Anterior</span></Link>}
      <span className="nc-pagination-pages">
        {numbered.map((value, index) => <span key={value}>
          {index > 0 && value - numbered[index - 1] > 1 && <span className="nc-pagination-gap" aria-hidden="true">…</span>}
          {value === page ? <strong aria-current="page" aria-label={`Página ${value}, actual`}>{number(value)}</strong> : <Link href={href(value)} aria-label={`Ir a la página ${value}`}>{number(value)}</Link>}
        </span>)}
      </span>
      {page < pages && <Link className="nc-pagination-direction" href={href(page + 1)} aria-label="Página siguiente"><span>Siguiente</span><ChevronRight size={17} aria-hidden="true"/></Link>}
    </nav>
  );
}
