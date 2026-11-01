import Link from 'next/link';
import {Suspense} from 'react';
import Operations from './Operations';
import type { Metadata } from 'next';
import ArchiveNotice from "@/components/nocturno/ArchiveNotice";
import { number } from "@/lib/cuaderno/model";
import { preparedGeneration, recordView } from "@/lib/revista/read-records";
import { SURFACES, surfaceLabel } from "@/lib/surface";
import type { IngestionBreakdown } from "@/lib/revista/snapshot";
import { archiveDate, archiveFreshnessSummary } from '@/lib/archive-freshness';

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
  const emptyBreakdown:IngestionBreakdown={matches:0,ranking:0,statistics:0,points:0};
  const apiSignals=[
    {key:"matches" as const,label:"Partidos"},
    {key:"ranking" as const,label:"Ranking"},
    {key:"statistics" as const,label:"Estadísticas"},
    {key:"points" as const,label:"Punto a punto"},
  ];
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
      <div className="coverage-hero-copy"><h1>Cobertura<br/>del archivo.</h1><p>Qué datos incluye el archivo y qué añade cada actualización diaria.</p></div>
      <dl className="coverage-hero-stats">
        <div><dt>Partidos</dt><dd>{number(manifest.matchCount)}</dd></div>
        <div><dt>Torneos</dt><dd>{number(manifest.summary.tournaments)}</dd></div>
        <div><dt>Temporadas</dt><dd>{firstYear&&lastYear?`${firstYear}–${lastYear}`:"En revisión"}</dd></div>
      </dl>
      <p className="coverage-updated"><span aria-hidden="true"/>{`Copia generada ${updated} · Madrid · Último partido con fecha exacta: ${latestExact}`}</p>
      <p className="coverage-updated">ATP {number(manifest.summary.tours?.atp ?? manifest.matchCount)} · WTA {number(manifest.summary.tours?.wta ?? 0)} partidos. El histórico femenino se incorpora por temporadas verificadas.</p>
    </header>

    <Suspense fallback={<p role="status">Consultando el estado de las actualizaciones…</p>}><Operations manifest={manifest} source={generation.source}/></Suspense>
    {stale&&<section className="coverage-piece" aria-labelledby="coverage-stale-title"><div><h2 id="coverage-stale-title">La última actualización no está disponible</h2><p>Cobertura muestra la copia validada generada el {updated}. No interpretamos la ausencia de una publicación nueva como un día sin partidos.</p></div><dl><div><dt>Estado</dt><dd>{generation.fallbackReason?'Archivo de respaldo':'Publicación pendiente de actualizar'}</dd></div><div><dt>Antigüedad de la copia</dt><dd>{number(ageHours,1)} horas</dd></div><div><dt>Último partido con fecha exacta</dt><dd>{latestExact}</dd></div></dl></section>}

    {selection?.piece&&<section className="coverage-piece" id="estadistica"><div><h2>{selection.piece.title}</h2><p>{selection.piece.definition}</p></div><dl><div><dt>Periodo</dt><dd>{selection.piece.years}</dd></div><div><dt>Muestra</dt><dd>{number(selection.piece.sample)}</dd></div><div><dt>Mínimo</dt><dd>{selection.piece.minimum} casos</dd></div></dl></section>}

    <section className="coverage-daily" aria-labelledby="coverage-daily-title">
      <div className="coverage-section-copy"><h2 id="coverage-daily-title">Todo lo añadido, día a día</h2><p>ATP se consulta entre las 04:00 y las 04:59 UTC; WTA entre las 06:00 y las 06:59 UTC. La validación y publicación se intentan entre las 08:00 y las 08:59 UTC.</p></div>
      <div className="coverage-api-ledger">
        <ol className="coverage-api-days">{[...tracked].reverse().map((day,index)=>{
          const included=day.included||{...emptyBreakdown,matches:day.added};
          const totals=day.totals||{...emptyBreakdown,matches:day.total};
          const hasDetailedHistory=!!day.included;
          return <li key={`${day.date}-${index}`} className={index===0?"is-latest":undefined}>
            <header><time dateTime={day.date}>{new Date(`${day.date}T12:00:00Z`).toLocaleDateString("es-ES",{weekday:"short",day:"2-digit",month:"short",timeZone:"UTC"})}</time><span>{index===0?"Última publicación":"Publicada"}</span></header>
            <strong>{day.added>0?`+${number(day.added)}`:hasDetailedHistory?"Sin partidos nuevos":"Publicación sin detalle"}</strong>
            <span className="coverage-api-total">{day.corrected===undefined?"Correcciones: sin medición registrada":`${number(day.corrected)} partidos corregidos`}</span>
            <span className="coverage-api-total">{number(day.total)} partidos en el archivo</span>
            {day.tourAdded&&<span className="coverage-api-total">ATP +{number(day.tourAdded.atp)} · WTA +{number(day.tourAdded.wta)}</span>}
            <dl>{apiSignals.map(signal=><div key={signal.key} data-signal={signal.key}><dt><i aria-hidden="true"/>{signal.label}</dt><dd><strong>{hasDetailedHistory?`+${number(included[signal.key])}`:"Sin detalle"}</strong>{hasDetailedHistory&&<span>{number(totals[signal.key])} en total</span>}</dd></div>)}</dl>
          </li>;
        })}</ol>
      </div>
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
