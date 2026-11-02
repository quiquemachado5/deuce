import {Suspense} from 'react';
import Operations from './Operations';
import type { Metadata } from 'next';
import ArchiveNotice from "@/components/nocturno/ArchiveNotice";
import { number } from "@/lib/cuaderno/model";
import { preparedGeneration } from "@/lib/revista/read-records";
import { SURFACES, surfaceLabel } from "@/lib/surface";
import { archiveDate, archiveFreshnessSummary } from '@/lib/archive-freshness';
import { summarizeCircuits, type YearCoverage } from '@/lib/dataset-summary';
import styles from './coverage.module.css';

const title = 'Cobertura y frescura del archivo — DEUCE';
const description = 'Consulta cuántos partidos ATP y WTA están publicados y qué datos incorpora DEUCE cada día.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/cobertura" },
  openGraph: { title, description, url: '/cobertura', type: 'website', images: ['/opengraph-image'] },
  twitter: { card: 'summary_large_image', title, description, images: ['/opengraph-image'] },
};
export const revalidate = 300;

type Circuit = 'atp' | 'wta';

function coverageTotals(years: YearCoverage[]) {
  return years.reduce((sum,row)=>({
    matches:sum.matches+row.matches,
    ranking:sum.ranking+row.ranking,
    statistics:sum.statistics+row.statistics,
    points:sum.points+row.points,
  }),{matches:0,ranking:0,statistics:0,points:0});
}

function percentage(value:number,total:number){
  return total?`${number(value/total*100,value&&value/total*100<1?2:1)} %`:'—';
}

export default async function Coverage() {
  const generation=await preparedGeneration();
  const manifest=generation.manifest;
  const circuits=manifest.circuitSummary ?? summarizeCircuits(await generation.matches());
  const updated=new Date(manifest.generatedAt).toLocaleString("es-ES",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Madrid"});
  const freshness=archiveFreshnessSummary(manifest);
  const latestExact=freshness.latestExactDate?archiveDate(freshness.latestExactDate):'Pendiente de fecha exacta verificada';
  const circuitDate=(tour:Circuit)=>{
    const date=manifest.circuitFreshness?.[tour].latestExactDate;
    return date?`Hasta ${archiveDate(date)}`:'Sin fecha exacta registrada';
  };
  const circuitCards=(['atp','wta'] as const).map(tour=>{
    const summary=circuits[tour],totals=coverageTotals(summary.years);
    const first=summary.years.at(-1)?.year,last=summary.years[0]?.year;
    return {tour,summary,totals,range:first&&last?first===last?String(first):`${first}–${last}`:'Sin temporadas'};
  });
  return <div className="nc-wrap deuce-coverage coverage-brief">
    <ArchiveNotice status={generation}/>
    <header className="coverage-hero">
      <div className="coverage-hero-copy"><span>Archivo publicado</span><h1>Cobertura.</h1><p>Totales ATP y WTA, y los datos que se incorporan cada día.</p></div>
      <dl className="coverage-hero-stats">
        <div><dt>Partidos ATP</dt><dd>{number(manifest.summary.tours?.atp ?? manifest.matchCount)}<small>{circuitDate('atp')}</small></dd></div>
        <div><dt>Partidos WTA</dt><dd>{number(manifest.summary.tours?.wta ?? 0)}<small>{circuitDate('wta')}</small></dd></div>
        <div><dt>Total publicado</dt><dd>{number(manifest.matchCount)}<small>Último partido: {latestExact}</small></dd></div>
      </dl>
      <p className="coverage-updated"><span aria-hidden="true"/>{`Copia regenerada ${updated}`}</p>
    </header>

    <Suspense fallback={<p role="status">Consultando las actualizaciones…</p>}><Operations manifest={manifest}/></Suspense>

    <section className={`coverage-snapshot ${styles.circuitCoverage}`} aria-labelledby="coverage-snapshot-title">
      <div className="coverage-section-copy"><h2 id="coverage-snapshot-title">Qué contiene cada circuito</h2><p>ATP y WTA se miden por separado. Cero significa que la copia publicada no contiene ese tipo de dato; un campo vacío nunca se interpreta como cero.</p></div>
      <div className={styles.circuitGrid}>{circuitCards.map(({tour,summary,totals,range})=><article className={styles.circuitCard} key={tour}>
        <header><div><span>{tour.toUpperCase()}</span><h3>{number(totals.matches)} partidos</h3></div><p>{range}<small>{circuitDate(tour)}</small></p></header>
        <dl className={styles.dataGrid}>
          <div><dt>Ranking al jugar</dt><dd>{number(totals.ranking)}<small>{percentage(totals.ranking,totals.matches)}</small></dd></div>
          <div><dt>Estadísticas</dt><dd>{number(totals.statistics)}<small>{percentage(totals.statistics,totals.matches)}</small></dd></div>
          <div><dt>Punto a punto</dt><dd>{number(totals.points)}<small>{percentage(totals.points,totals.matches)}</small></dd></div>
          <div><dt>Torneos</dt><dd>{number(summary.tournaments)}<small>nombres publicados</small></dd></div>
        </dl>
        {tour==='wta'&&totals.statistics===0&&totals.points===0?<p className={styles.circuitNote}>La muestra WTA publicada contiene resultados y marcadores. No atribuye estadísticas ni secuencias punto a punto que el proveedor no ha entregado.</p>:null}
        <details className={styles.seasons} open>
          <summary>Cobertura por temporada <span>{summary.years.length}</span></summary>
          <div className={styles.tableScroll} role="region" aria-label={`Cobertura ${tour.toUpperCase()} por temporada`} tabIndex={0}><table><thead><tr><th>Temporada</th><th>Partidos</th><th>Ranking</th><th>Estadísticas</th><th>Puntos</th></tr></thead><tbody>{summary.years.map(row=><tr key={row.year}><th>{row.year}</th><td>{number(row.matches)}</td><td>{number(row.ranking)}</td><td>{number(row.statistics)}</td><td>{number(row.points)}</td></tr>)}</tbody></table></div>
        </details>
      </article>)}</div>
      <div className="coverage-section-copy"><h2>Superficies del archivo conjunto</h2><p>Este reparto suma ATP y WTA; los campos de ranking, estadísticas y puntos se mantienen separados arriba.</p></div>
      <dl className="coverage-surface-strip">{SURFACES.map(surface=><div key={surface} data-event-surface={surface}><dt>{surfaceLabel[surface]}</dt><dd>{number(manifest.summary.surfaces[surface])}</dd></div>)}</dl>
    </section>

    <footer className="coverage-footer">
      <p>Las retiradas y los partidos sin jugar se conservan con su estado. Las lagunas históricas permanecen visibles; no se completan con estimaciones.</p>
      <small>Datos calculados sobre la copia publicada el {updated}.</small>
    </footer>
  </div>;
}
