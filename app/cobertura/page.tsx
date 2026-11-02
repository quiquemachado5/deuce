import Link from 'next/link';
import {Suspense} from 'react';
import Operations from './Operations';
import type { Metadata } from 'next';
import ArchiveNotice from "@/components/nocturno/ArchiveNotice";
import { number } from "@/lib/cuaderno/model";
import { preparedGeneration, recordView } from "@/lib/revista/read-records";
import { SURFACES, surfaceLabel } from "@/lib/surface";
import { archiveDate, archiveFreshnessSummary } from '@/lib/archive-freshness';
import styles from './coverage.module.css';

const title = 'Cobertura y frescura del archivo — DEUCE';
const description = 'Consulta cuándo se generó la copia de DEUCE, hasta qué partido llega y qué datos ATP y WTA están publicados y qué lagunas siguen abiertas.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/cobertura" },
  openGraph: { title, description, url: '/cobertura', type: 'website', images: ['/opengraph-image'] },
  twitter: { card: 'summary_large_image', title, description, images: ['/opengraph-image'] },
};
export const revalidate = 300;

export default async function Coverage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query=await searchParams;
  const [generation,selection]=await Promise.all([
    preparedGeneration(),
    query.dato?recordView(JSON.stringify(query)):Promise.resolve(null),
  ]);
  const manifest=generation.manifest,years=manifest.summary.years,yearValues=years.map(row=>row.year);
  const firstYear=yearValues.length?Math.min(...yearValues):undefined,lastYear=yearValues.length?Math.max(...yearValues):undefined;
  const totals=years.reduce((sum,row)=>({ranking:sum.ranking+row.ranking,statistics:sum.statistics+row.statistics,points:sum.points+row.points}),{ranking:0,statistics:0,points:0});
  const tracked=manifest.ingestionHistory?.length?manifest.ingestionHistory:[{date:manifest.generatedAt.slice(0,10),added:0,total:manifest.matchCount}];
  const updated=new Date(manifest.generatedAt).toLocaleString("es-ES",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Madrid"});
  const freshness=archiveFreshnessSummary(manifest),ageHours=freshness.copyAgeHours,stale=ageHours>36||Boolean(generation.fallbackReason);
  const latestExact=freshness.latestExactDate?archiveDate(freshness.latestExactDate):'Pendiente de fecha exacta verificada';
  const coverage=[
    {label:"Ranking de la fecha",value:totals.ranking},
    {label:"Estadísticas del partido",value:totals.statistics},
    {label:"Punto a punto",value:totals.points},
  ];
  return <div className="nc-wrap deuce-coverage coverage-brief">
    <ArchiveNotice status={generation}/>
    <header className="coverage-hero">
      <div className="coverage-hero-copy"><span>Datos y actualizaciones</span><h1>Cobertura.</h1><p>Hasta dónde llega DEUCE, cuándo se actualiza y qué sigue pendiente.</p></div>
      <dl className="coverage-hero-stats">
        <div><dt>ATP</dt><dd>{number(manifest.summary.tours?.atp ?? manifest.matchCount)}</dd></div>
        <div><dt>WTA</dt><dd>{number(manifest.summary.tours?.wta ?? 0)}</dd></div>
        <div><dt>Periodo</dt><dd>{firstYear&&lastYear?`${firstYear}–${lastYear}`:"En revisión"}</dd></div>
      </dl>
      <p className="coverage-updated"><span aria-hidden="true"/>{`Copia generada ${updated} · Madrid · Último partido con fecha exacta: ${latestExact}`}</p>
    </header>

    <Suspense fallback={<p role="status">Consultando el estado de las actualizaciones…</p>}><Operations manifest={manifest} source={generation.source}/></Suspense>
    {stale&&<section className="coverage-piece" aria-labelledby="coverage-stale-title"><div><h2 id="coverage-stale-title">La última actualización no está disponible</h2><p>Cobertura muestra la copia validada generada el {updated}. No interpretamos la ausencia de una publicación nueva como un día sin partidos.</p></div><dl><div><dt>Estado</dt><dd>{generation.fallbackReason?'Archivo de respaldo':'Publicación pendiente de actualizar'}</dd></div><div><dt>Antigüedad de la copia</dt><dd>{number(ageHours,1)} horas</dd></div><div><dt>Último partido con fecha exacta</dt><dd>{latestExact}</dd></div></dl></section>}

    {selection?.piece&&<section className="coverage-piece" id="estadistica"><div><h2>{selection.piece.title}</h2><p>{selection.piece.definition}</p></div><dl><div><dt>Periodo</dt><dd>{selection.piece.years}</dd></div><div><dt>Muestra</dt><dd>{number(selection.piece.sample)}</dd></div><div><dt>Mínimo</dt><dd>{selection.piece.minimum} casos</dd></div></dl></section>}

    <section className={styles.history} aria-labelledby="coverage-daily-title">
      <header><span>Historial de publicaciones</span><h2 id="coverage-daily-title">Qué cambió cada día</h2><p>Solo aparecen incorporaciones publicadas. Una fecha sin detalle no se interpreta como cero.</p></header>
      <div className={styles.tableWrap} role="region" aria-label="Historial diario de publicaciones" tabIndex={0}><table><thead><tr><th>Fecha</th><th>Nuevos</th><th>Corregidos</th><th>ATP / WTA</th><th>Total</th></tr></thead><tbody>{[...tracked].reverse().slice(0,10).map((day,index)=><tr key={`${day.date}-${index}`}>
        <th scope="row"><time dateTime={day.date}>{new Date(`${day.date}T12:00:00Z`).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})}</time>{index===0&&<small>Última</small>}</th>
        <td>{day.included?number(day.added):'—'}</td><td>{day.corrected===undefined?'—':number(day.corrected)}</td>
        <td>{day.tourAdded?`${number(day.tourAdded.atp)} / ${number(day.tourAdded.wta)}`:'—'}</td><td>{number(day.total)}</td>
      </tr>)}</tbody></table></div>
    </section>

    <section className="coverage-snapshot" aria-labelledby="coverage-snapshot-title">
      <div className="coverage-section-copy"><h2 id="coverage-snapshot-title">Datos disponibles</h2><p>Un campo vacío no cuenta como cero. Cada porcentaje se calcula solo con información publicada.</p></div>
      <div className="coverage-data-summary">{coverage.map(item=>{const percent=manifest.matchCount?item.value/manifest.matchCount*100:0;return <div key={item.label}><strong>{number(item.value)}</strong><span>{item.label}</span><small>{number(percent,1)} % del archivo</small></div>})}</div>
      <dl className="coverage-surface-strip">{SURFACES.map(surface=><div key={surface} data-event-surface={surface}><dt>{surfaceLabel[surface]}</dt><dd>{number(manifest.summary.surfaces[surface])}</dd></div>)}</dl>
    </section>

    <footer className="coverage-footer">
      <p>Las retiradas y los partidos sin jugar se conservan con su estado. Las lagunas históricas permanecen visibles; no se completan con estimaciones.</p>
      <nav aria-label="Más información sobre los datos"><Link href="/cobertura/revision">Revisión histórica</Link><Link href="/info">Método y fuentes</Link><Link href="/records">Explorar récords</Link></nav>
      <small>Datos {manifest.version} · Reglas {manifest.rulesVersion} · {generation.source==="remote"?"generación remota validada":"copia validada del despliegue"}</small>
    </footer>
  </div>;
}
