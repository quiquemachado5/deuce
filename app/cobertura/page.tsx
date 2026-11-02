import {Suspense} from 'react';
import Operations from './Operations';
import type { Metadata } from 'next';
import ArchiveNotice from "@/components/nocturno/ArchiveNotice";
import { number } from "@/lib/cuaderno/model";
import { preparedGeneration } from "@/lib/revista/read-records";
import { SURFACES, surfaceLabel } from "@/lib/surface";
import { archiveDate, archiveFreshnessSummary } from '@/lib/archive-freshness';

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

export default async function Coverage() {
  const generation=await preparedGeneration();
  const manifest=generation.manifest,years=manifest.summary.years;
  const totals=years.reduce((sum,row)=>({ranking:sum.ranking+row.ranking,statistics:sum.statistics+row.statistics,points:sum.points+row.points}),{ranking:0,statistics:0,points:0});
  const updated=new Date(manifest.generatedAt).toLocaleString("es-ES",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Madrid"});
  const freshness=archiveFreshnessSummary(manifest);
  const latestExact=freshness.latestExactDate?archiveDate(freshness.latestExactDate):'Pendiente de fecha exacta verificada';
  const coverage=[
    {label:"Ranking de la fecha",value:totals.ranking},
    {label:"Estadísticas del partido",value:totals.statistics},
    {label:"Punto a punto",value:totals.points},
  ];
  return <div className="nc-wrap deuce-coverage coverage-brief">
    <ArchiveNotice status={generation}/>
    <header className="coverage-hero">
      <div className="coverage-hero-copy"><span>Archivo publicado</span><h1>Cobertura.</h1><p>Totales ATP y WTA, y los datos que se incorporan cada día.</p></div>
      <dl className="coverage-hero-stats">
        <div><dt>Partidos ATP</dt><dd>{number(manifest.summary.tours?.atp ?? manifest.matchCount)}</dd></div>
        <div><dt>Partidos WTA</dt><dd>{number(manifest.summary.tours?.wta ?? 0)}</dd></div>
        <div><dt>Total publicado</dt><dd>{number(manifest.matchCount)}</dd></div>
      </dl>
      <p className="coverage-updated"><span aria-hidden="true"/>{`Actualizado ${updated} · Último partido: ${latestExact}`}</p>
    </header>

    <Suspense fallback={<p role="status">Consultando las actualizaciones…</p>}><Operations manifest={manifest}/></Suspense>

    <section className="coverage-snapshot" aria-labelledby="coverage-snapshot-title">
      <div className="coverage-section-copy"><h2 id="coverage-snapshot-title">Datos disponibles</h2><p>Un campo vacío no cuenta como cero. Cada porcentaje se calcula solo con información publicada.</p></div>
      <div className="coverage-data-summary">{coverage.map(item=>{const percent=manifest.matchCount?item.value/manifest.matchCount*100:0;return <div key={item.label}><strong>{number(item.value)}</strong><span>{item.label}</span><small>{number(percent,1)} % del archivo</small></div>})}</div>
      <dl className="coverage-surface-strip">{SURFACES.map(surface=><div key={surface} data-event-surface={surface}><dt>{surfaceLabel[surface]}</dt><dd>{number(manifest.summary.surfaces[surface])}</dd></div>)}</dl>
    </section>

    <footer className="coverage-footer">
      <p>Las retiradas y los partidos sin jugar se conservan con su estado. Las lagunas históricas permanecen visibles; no se completan con estimaciones.</p>
      <small>Datos calculados sobre la copia publicada el {updated}.</small>
    </footer>
  </div>;
}
