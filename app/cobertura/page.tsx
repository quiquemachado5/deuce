import historicalDispute from '@/data/integrity/us-open-1969-score-review.json';
import { CoverageCalendar } from '@/components/deuce/CoverageCalendar';
import Link from 'next/link';
import {ArrowUpRight, ChevronDown, Check} from 'lucide-react';
import type {Metadata} from 'next';
import {number} from '@/lib/cuaderno/model';
import {preparedCompactArchive, preparedGeneration, preparedPublicArchive} from '@/lib/revista/read-records';
import type {IngestionDay} from '@/lib/revista/snapshot';
import {summarizeCircuits} from '@/lib/dataset-summary';
import {archiveDate} from '@/lib/archive-freshness';
import webReview from '@/data/integrity/web-reconciliation-2026-11-11.json';
import styles from './overview.module.css';

export const metadata:Metadata={title:'Cobertura y actualizaciones — DEUCE',description:'Qué incluye el archivo ATP y WTA y qué se incorpora cada día.',alternates:{canonical:'/cobertura'}};
export const revalidate=300;
const dayLabel=(date:string)=>new Date(`${date}T12:00:00Z`).toLocaleDateString('es-ES',{day:'numeric',month:'long',timeZone:'UTC'});

function PublicationDay({day}:{day:IngestionDay}){
  const additions=day.included;
  return <li className={styles.day}>
    <time dateTime={day.date}>{dayLabel(day.date)}<small>{day.date.slice(0,4)}</small></time>
    <div className={styles.dayContent}>
      <strong>{day.added>0?`+${number(day.added)} partidos`:'Sin partidos nuevos'}</strong>
      {day.tourAdded&&day.added>0&&<span>ATP +{number(day.tourAdded.atp)} <i aria-hidden="true">·</i> WTA +{number(day.tourAdded.wta)}</span>}
      {Boolean(day.corrected)&&<span>{number(day.corrected!)} registros actualizados</span>}
      {day.changeTypes&&<p className={styles.enrichment}>{Object.entries(day.changeTypes).filter(([,count])=>count>0).map(([key,count])=>`${number(count)} ${{results:'resultados corregidos',ranking:'actualizaciones de ranking',statistics:'actualizaciones estadísticas',points:'actualizaciones de punto a punto',metadata:'actualizaciones de contexto o metadatos'}[key]}`).join(' · ')}</p>}
      {additions&&Boolean(additions.statistics||additions.points||additions.ranking)&&<p className={styles.enrichment}>{[
        additions.statistics?`${number(additions.statistics)} fichas con estadísticas`:null,
        additions.points?`${number(additions.points)} con punto a punto`:null,
        additions.ranking?`${number(additions.ranking)} con ranking`:null,
      ].filter(Boolean).join(' · ')}</p>}
    </div>
  </li>;
}

export default async function Coverage({ searchParams }:{ searchParams:Promise<{ fecha?:string; tour?:string; dato?:string }> }){
  const { fecha, tour: calendarTour, dato }=await searchParams;
  const {manifest}=await preparedGeneration();
  const publicArchive=await preparedPublicArchive();
  const methodTour=calendarTour==='wta'?'wta':'atp';
  const method=(methodTour==='wta'?manifest.circuitPieces?.wta:manifest.pieces)?.find(piece=>piece.id===dato);
  const stored=manifest.circuitSummary;
  const circuits=stored?.atp.categories?.length&&stored?.wta.categories?.length?stored:summarizeCircuits(await preparedCompactArchive('all'));
  const days=[...(manifest.ingestionHistory||[])].filter(day=>day.included).sort((a,b)=>b.date.localeCompare(a.date));
  const review=webReview.version===manifest.version?webReview:undefined;
  const updated=new Date(manifest.generatedAt).toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Madrid'});
  return <div className={styles.page}>
    <header className={styles.hero}><h1>Cobertura</h1><p>El archivo, de un vistazo.</p></header>
    <section className={styles.scope} aria-labelledby="coverage-scope-title">
      <div className={styles.sectionHeading}><h2 id="coverage-scope-title">Qué puedes consultar</h2><span>{number(manifest.matchCount)} partidos</span></div>
      <div className={styles.circuits}>{(['atp','wta'] as const).map(tour=>{
        const summary=circuits[tour];
        const total=manifest.summary.tours[tour];
        const first=summary.years.at(-1)?.year,last=summary.years[0]?.year;
        const date=manifest.circuitFreshness?.[tour].latestExactDate;
        return <article className={styles.circuit} key={tour}>
          <header><h3>{tour.toUpperCase()}</h3><span>{first}—{last}</span></header>
          <p><strong>{number(total)}</strong> partidos</p>
          <span className={styles.latest}>{date?`Último resultado: ${archiveDate(date)}`:'Sin resultados fechados'}</span>
          <details className={styles.categories}>
            <summary>Categorías y años <ChevronDown size={15} aria-hidden="true"/></summary>
            <dl>{summary.categories.map(category=><div key={category.category}><dt>{category.category}</dt><dd>{category.firstYear}–{category.lastYear}</dd></div>)}</dl>
          </details>
          <Link href={`/partidos?tour=${tour}`} aria-label={`Ver partidos ${tour.toUpperCase()}`}><ArrowUpRight size={21}/></Link>
        </article>;
      })}</div>
    </section>
    {dato&&<section className={styles.quality} id="estadistica" aria-labelledby="method-title"><div><h2 id="method-title">{method?.title||'Estadística no disponible'} · {methodTour.toUpperCase()}</h2>{method?<><p>{method.definition}</p><p>Periodo documentado: {method.years}. Muestra: {number(method.sample)} casos; mínimo del cálculo: {number(method.minimum)}.{method.percent?' La clasificación principal exige al menos 50 casos; las muestras menores se muestran por separado.':''}</p><p>{method.measured?'Este cálculo exige los campos estadísticos o el punto a punto documentados; los partidos sin esos campos no aportan observaciones.':'Se calcula sobre los resultados validados del circuito seleccionado.'} Las retiradas con ganador confirmado cuentan como partidos y victorias; solo se utilizan los juegos, sets y estadísticas realmente jugados. Los walkovers y las cancelaciones no cuentan como partidos disputados.</p><p>La tabla describe la muestra publicada, no certifica un récord mundial. El enlace «Partidos» de cada fila permite comprobar su evidencia.</p><Link href={`/records?dato=${encodeURIComponent(method.id)}${methodTour==='wta'?'&tour=wta':''}`}>Volver a la clasificación <ArrowUpRight size={16}/></Link></>:<p>Selecciona una estadística del archivo de récords para consultar su definición y su muestra.</p>}</div></section>}
    <details className={styles.matrix}><summary>Cobertura por categoría y década <ChevronDown size={17}/></summary><p>Ediciones recibidas y estado de su cuadro. «Sin certificar» no significa que falten partidos. Estos recuentos no miden el porcentaje de todo el tenis histórico.</p><div className={styles.matrixScroll}><table><caption>Cobertura de la generación activa, por circuito, categoría y década</caption><thead><tr><th>Circuito / categoría</th><th>Periodo</th><th>Partidos</th><th>Ediciones</th><th>Cuadros certificados</th><th>Con incidencias</th><th>Sin certificar</th></tr></thead><tbody>{publicArchive.coverage.map(row=><tr key={`${row.tour}:${row.category}:${row.decade}`}><th scope="row">{row.tour.toUpperCase()} · {row.category}</th><td>{row.decade}–{row.decade+9}<small>{row.years.length} años con datos</small></td><td>{number(row.matches)}</td><td>{number(row.editions)}</td><td>{number(row.certified)}</td><td>{number(row.inconsistent)}</td><td>{number(Math.max(0,row.editions-row.certified-row.inconsistent))}</td></tr>)}</tbody></table></div></details>
    <section className={styles.activity} aria-labelledby="coverage-activity-title">
      <div className={styles.activityIntro}><h2 id="coverage-activity-title">Qué se añade cada día</h2><p>Fecha de incorporación al archivo, no del partido.</p><Link href="/cobertura/correcciones">Historial de correcciones <ArrowUpRight size={16} aria-hidden="true"/></Link></div>
      <div className={styles.journal}>{days.length?<><ol>{days.slice(0,3).map(day=><PublicationDay key={day.date} day={day}/>)}</ol>{days.length>3&&<details className={styles.previous}><summary>Días anteriores <ChevronDown size={17}/></summary><ol>{days.slice(3).map(day=><PublicationDay key={day.date} day={day}/>)}</ol></details>}</>:<p>Todavía no hay publicaciones registradas.</p>}</div>
    </section>
    <section className={styles.quality} id="calidad" aria-labelledby="coverage-quality-title"><Check size={23} aria-hidden="true"/><div><h2 id="coverage-quality-title">Un archivo en revisión continua</h2><p>Contrastamos los resultados y actualizamos las estadísticas con cada corrección.{review?` Última revisión: ${number(review.references)} resultados contrastados en la web. Quedan ${number(review.afterConfirmed)} incidencias de cuadros en revisión.`:''}</p><details><summary>Cómo interpretar los datos <ChevronDown size={16}/></summary><p>La presencia de un torneo no garantiza que su cuadro esté completo. Las estadísticas de servicio, ranking y punto a punto aparecen únicamente cuando están documentadas. Los resultados pendientes de verificar no se presentan como confirmados.</p><p>Incidencia contrastada: US Open femenino 1969, Wendy Overton–Jitka Horcickova. La <a href={historicalDispute.sources[0].url} target="_blank" rel="noreferrer">fuente oficial ITF</a> conserva «7–3 6–2»; <a href={historicalDispute.sources[1].url} target="_blank" rel="noreferrer">DB4Tennis</a> publica «6–3 6–2». El set sigue sin confirmar: no se añaden juegos por deducción.</p><p>Los récords y el palmarés se recalculan al publicar resultados nuevos. Las biografías de Wikipedia/Wikidata pueden completar edades cuando conocemos el día exacto del partido; nunca sustituyen un marcador ni un dato ya recibido del proveedor.</p></details></div></section>
    <CoverageCalendar value={fecha} circuit={calendarTour}/>
    <p className={styles.updated}>Última publicación: <time dateTime={manifest.generatedAt}>{updated}</time>.</p>
  </div>;
}
