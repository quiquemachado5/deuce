import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import Operations from './Operations';
import Reconciliation from './Reconciliation';
import { number } from '@/lib/cuaderno/model';
import { preparedCompactArchive, preparedCoverageReconciliation, preparedGeneration } from '@/lib/revista/read-records';
import { summarizeCircuits } from '@/lib/dataset-summary';
import { archiveDate } from '@/lib/archive-freshness';
import { SURFACES, surfaceLabel } from '@/lib/surface';
import styles from './overview.module.css';

export const metadata: Metadata = {
  title: 'Cobertura del archivo — DEUCE',
  description: 'Partidos, temporadas y actualización del archivo ATP y WTA.',
  alternates: { canonical: '/cobertura' },
};
export const revalidate = 300;

export default async function Coverage() {
  const [generation,reconciliation] = await Promise.all([preparedGeneration(),preparedCoverageReconciliation()]);
  const manifest = generation.manifest;
  const stored = manifest.circuitSummary;
  const circuits = stored?.atp.categories?.length && stored?.wta.categories?.length
    ? stored
    : summarizeCircuits(await preparedCompactArchive('all'));
  const updated = new Date(manifest.generatedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Madrid' });
  return <div className={styles.page}>
    <header className={styles.hero}>
      <div><h1>Cobertura</h1><p>Qué contiene el archivo, qué ha entrado cada día y qué controles supera antes de publicarse.</p></div>
      <div className={styles.total}><strong>{number(manifest.matchCount)}</strong><span>partidos publicados</span></div>
    </header>
    <section className={styles.circuits} aria-label="Cobertura por circuito">
      {(['atp', 'wta'] as const).map(tour => {
        const summary = circuits[tour];
        const totals = summary.years.reduce((sum, year) => ({ matches: sum.matches + year.matches, ranking: sum.ranking + year.ranking, statistics: sum.statistics + year.statistics, points: sum.points + year.points }), { matches: 0, ranking: 0, statistics: 0, points: 0 });
        const first = summary.years.at(-1)?.year;
        const last = summary.years[0]?.year;
        const date = manifest.circuitFreshness?.[tour].latestExactDate;
        return <article className={styles.card} key={tour}>
          <header><span className={styles.tour}>{tour.toUpperCase()}</span><span>{first}—{last}</span></header>
          <dl className="coverage-hero-stats"><dt>Partidos {tour.toUpperCase()}</dt><dd>{number(totals.matches)}</dd></dl>
          <p className={styles.date}>{date ? `Hasta ${archiveDate(date)}` : 'Sin fecha exacta registrada'}</p>
          <div className={styles.metrics}><div><strong>{number(summary.tournaments)}</strong><span>torneos</span></div><div><strong>{number(totals.ranking)}</strong><span>con ranking</span></div><div><strong>{number(totals.statistics)}</strong><span>con estadísticas</span></div><div><strong>{number(totals.points)}</strong><span>con puntos</span></div></div>
          <div className={styles.categories} aria-label={`Categorías ${tour.toUpperCase()}`}>
            <h2>Categorías publicadas</h2>
            <dl>{summary.categories.map(category => <div key={category.category}><dt><span>{category.category}</span><small>{category.firstYear}—{category.lastYear}</small></dt><dd>{number(category.matches)}</dd></div>)}</dl>
          </div>
          {totals.statistics === 0 && <p className={styles.note}>Resultados y marcadores; estadísticas de juego aún no disponibles.</p>}
          <Link className={styles.link} href={tour === 'wta' ? '/buscar?tour=wta' : '/buscar'}>Explorar {tour.toUpperCase()} <span aria-hidden="true">↗</span></Link>
          <details className={styles.seasons}>
            <summary>Por temporada <span>{summary.years.length}</span></summary>
            <div className={styles.table} role="region" aria-label={`Cobertura ${tour.toUpperCase()} por temporada`} tabIndex={0}>
              <table><thead><tr><th>Año</th><th>Partidos</th><th>Estadísticas</th><th>Puntos</th></tr></thead><tbody>{summary.years.map(year => <tr key={year.year}><th>{year.year}</th><td>{number(year.matches)}</td><td>{number(year.statistics)}</td><td>{number(year.points)}</td></tr>)}</tbody></table>
            </div>
          </details>
        </article>;
      })}
    </section>
    <p className={styles.scopeNote}><strong>ATP también incluye ATP 500 y ATP 250.</strong> Ambos circuitos publican Grand Slam y sus categorías 1000, 500 y 250; WTA suma además WTA 125 y su categoría histórica equivalente. Las cifras se calculan por separado y nunca mezclan ATP con WTA.</p>
    <Reconciliation report={reconciliation}/>
    <Suspense fallback={<p role="status">Consultando actualizaciones…</p>}><Operations manifest={manifest}/></Suspense>
    <section className={styles.surfaces} aria-labelledby="surfaces-title">
      <h2 id="surfaces-title">Por superficie</h2>
      <div>{SURFACES.filter(surface => manifest.summary.surfaces[surface] > 0).map(surface => <div className={styles.surface} key={surface} data-event-surface={surface}><span>{surfaceLabel[surface]}</span><strong>{number(manifest.summary.surfaces[surface])}</strong><i style={{width:`${manifest.summary.surfaces[surface]/manifest.matchCount*100}%`}}/></div>)}</div>
    </section>
    <footer className={styles.footer}><p>Actualizado: <time>{updated}</time></p><p>Versión {manifest.version}</p><Link href="#calidad">Volver al control del archivo ↑</Link></footer>
  </div>;
}
