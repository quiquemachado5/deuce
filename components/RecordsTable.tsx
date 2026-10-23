import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { number } from '@/lib/cuaderno/model';
import { evidenceHref } from '@/lib/record-evidence';
import type { RecordRow } from '@/lib/revista/records';
import { recordValue } from '@/components/nocturno/RecordsViews';
import styles from '@/app/records/records.module.css';

export function RecordsPagination({ page, total, href }: { page: number; total: number; href: (page: number) => string }) {
  const pages = Math.ceil(total / 25);
  if (pages <= 1) return null;
  return <nav className={styles.pagination} aria-label="Páginas de la clasificación">
    <div>{page > 1 && <Link href={href(page - 1)} rel="prev"><ChevronLeft size={15} aria-hidden="true" />Anterior</Link>}</div>
    <span>{number(page)} de {number(pages)}</span>
    <div>{page < pages && <Link href={href(page + 1)} rel="next">Siguiente<ChevronRight size={15} aria-hidden="true" /></Link>}</div>
  </nav>;
}

export default function RecordsTable({ rows, offset = 0, percent = false, asYear = false, priorValue, id, query, small = false }: {
  rows: RecordRow[]; offset?: number; percent?: boolean; asYear?: boolean; priorValue?: number; id: string; query: Record<string, string | undefined>; small?: boolean;
}) {
  const sortedByValue = !query.sort || query.sort === 'value';
  const ceiling = percent ? 100 : Math.max(0, ...rows.map(row => row.value));
  return <div className={styles.tableWrap}>
    <table className={styles.table}>
      <caption className="nc-sr">{small ? 'Clasificación con muestras pequeñas' : 'Clasificación de la estadística'}</caption>
      <thead><tr><th scope="col">N.º</th><th scope="col">Jugador o partido</th><th scope="col">{asYear ? 'Año' : percent ? 'Porcentaje' : 'Cifra'}</th><th scope="col"><span className="nc-sr">Partidos de la clasificación</span></th></tr></thead>
      <tbody>{rows.map((row, index) => {
        const tied = sortedByValue && (rows[index - 1]?.value ?? priorValue) === row.value;
        const proof = row.href.startsWith('/match/') ? row.href : evidenceHref(id, row, query);
        return <tr key={`${row.href}-${row.name}-${index}`}>
          <td className={styles.place}>{tied ? <span aria-label="Empatado con la posición anterior">=</span> : number(offset + index + 1)}</td>
          <th scope="row" className={styles.person}><Link href={row.href}>{row.name}</Link>{row.detail && <span>{row.detail}</span>}
            {!asYear && sortedByValue && ceiling > 0 && offset === 0 && <span className={styles.track} aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, row.value / ceiling * 100))}%` }} /></span>}
          </th>
          <td className={styles.result}><strong>{recordValue(row, percent, asYear)}</strong>{percent && <small>{number(row.sample)} casos</small>}</td>
          <td className={styles.evidence}><Link prefetch={false} href={proof} aria-label={`Ver ${row.href.startsWith('/match/') ? 'partido' : 'partidos'} de ${row.name}`}><span>{row.href.startsWith('/match/') ? 'Partido' : 'Partidos'}</span><ChevronRight size={15} aria-hidden="true" /></Link></td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}
