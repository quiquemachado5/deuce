import Link from "next/link";
import ArchiveNotice from "@/components/nocturno/ArchiveNotice";
import { number } from "@/lib/cuaderno/model";
import { preparedGeneration, recordView } from "@/lib/revista/read-records";
import { SURFACES, surfaceLabel } from "@/lib/surface";

export const metadata = {
  title: "Cobertura del archivo — DEUCE",
  description: "Estado, actualización diaria y alcance de los datos del archivo de tenis.",
  alternates: { canonical: "/cobertura" },
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
  const tracked=manifest.ingestionHistory?.slice(-7)||[{date:manifest.generatedAt.slice(0,10),added:0,total:manifest.matchCount}];
  const maxAdded=Math.max(1,...tracked.map(day=>day.added));
  const updated=new Date(manifest.generatedAt).toLocaleString("es-ES",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Madrid"});
  const coverage=[
    {label:"Ranking de la fecha",value:totals.ranking},
    {label:"Estadísticas del partido",value:totals.statistics},
    {label:"Punto a punto",value:totals.points},
  ];
  return <main className="nc-wrap deuce-coverage coverage-brief">
    <ArchiveNotice status={generation}/>
    <header className="coverage-hero">
      <div className="coverage-hero-copy"><span>Archivo vivo</span><h1>Cobertura,<br/>sin letra pequeña.</h1><p>Qué hay publicado, qué se incorporó cada día y hasta dónde llega cada lectura.</p></div>
      <dl className="coverage-hero-stats">
        <div><dt>Partidos</dt><dd>{number(manifest.matchCount)}</dd></div>
        <div><dt>Torneos</dt><dd>{number(manifest.summary.tournaments)}</dd></div>
        <div><dt>Temporadas</dt><dd>{firstYear&&lastYear?`${firstYear}–${lastYear}`:"En revisión"}</dd></div>
      </dl>
      <p className="coverage-updated"><span aria-hidden="true"/>Actualizado {updated} · Madrid</p>
    </header>

    {selection?.piece&&<section className="coverage-piece" id="estadistica"><div><span>Esta estadística</span><h2>{selection.piece.title}</h2><p>{selection.piece.definition}</p></div><dl><div><dt>Periodo</dt><dd>{selection.piece.years}</dd></div><div><dt>Muestra</dt><dd>{number(selection.piece.sample)}</dd></div><div><dt>Mínimo</dt><dd>{selection.piece.minimum} casos</dd></div></dl></section>}

    <section className="coverage-daily" aria-labelledby="coverage-daily-title">
      <div className="coverage-section-copy"><span>Actualización diaria</span><h2 id="coverage-daily-title">Lo nuevo, día a día</h2><p>La API se consulta a las 04:00 UTC. La publicación validada queda disponible a las 05:00 UTC.</p></div>
      <ol className="coverage-daily-log">{tracked.map((day,index)=><li key={`${day.date}-${index}`}>
        <time dateTime={day.date}>{new Date(`${day.date}T12:00:00Z`).toLocaleDateString("es-ES",{day:"2-digit",month:"short",timeZone:"UTC"})}</time>
        <span className="coverage-daily-bar" aria-hidden="true"><i style={{width:`${Math.max(4,day.added/maxAdded*100)}%`}}/></span>
        <strong>{day.added>0?`+${number(day.added)}`:"Base"}</strong>
        <small>{number(day.total)} en total</small>
      </li>)}</ol>
    </section>

    <section className="coverage-snapshot" aria-labelledby="coverage-snapshot-title">
      <div className="coverage-section-copy"><span>Alcance real</span><h2 id="coverage-snapshot-title">Una cifra solo aparece cuando existe el dato.</h2><p>Un campo vacío no cuenta como cero. Los porcentajes usan únicamente partidos con numerador y denominador válidos.</p></div>
      <div className="coverage-data-bars">{coverage.map(item=>{const percent=manifest.matchCount?item.value/manifest.matchCount*100:0;return <div key={item.label}><span><b>{item.label}</b><strong>{number(item.value)}</strong></span><i aria-hidden="true"><span style={{width:`${percent}%`}}/></i><small>{number(percent,1)} % del archivo</small></div>})}</div>
      <dl className="coverage-surface-strip">{SURFACES.map(surface=><div key={surface} data-event-surface={surface}><dt>{surfaceLabel[surface]}</dt><dd>{number(manifest.summary.surfaces[surface])}</dd></div>)}</dl>
    </section>

    <footer className="coverage-footer">
      <p>Las retiradas y los partidos sin jugar se conservan con su estado. Las lagunas históricas permanecen visibles; no se completan con estimaciones.</p>
      <nav aria-label="Más información sobre los datos"><Link href="/cobertura/revision">Revisión histórica</Link><Link href="/info">Método y fuentes</Link><Link href="/records">Explorar récords</Link></nav>
      <small>Datos {manifest.version} · Reglas {manifest.rulesVersion} · {generation.source==="remote"?"generación remota validada":"copia validada del despliegue"}</small>
    </footer>
  </main>;
}
