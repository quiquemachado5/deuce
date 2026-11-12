import { CoverageCalendar } from '@/components/deuce/CoverageCalendar';
import Link from 'next/link';
import {ArrowUpRight, ChevronDown, Check} from 'lucide-react';
import type {Metadata} from 'next';
import {number} from '@/lib/cuaderno/model';
import {preparedCompactArchive, preparedGeneration} from '@/lib/revista/read-records';
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
      {Boolean(day.corrected)&&<span>{number(day.corrected!)} resultados corregidos</span>}
      {additions&&Boolean(additions.statistics||additions.points||additions.ranking)&&<p className={styles.enrichment}>{[
        additions.statistics?`${number(additions.statistics)} fichas con estadísticas`:null,
        additions.points?`${number(additions.points)} con punto a punto`:null,
        additions.ranking?`${number(additions.ranking)} con ranking`:null,
      ].filter(Boolean).join(' · ')}</p>}
    </div>
  </li>;
}

export default async function Coverage({ searchParams }:{ searchParams:Promise<{ fecha?:string; tour?:string }> }){
  const { fecha, tour: calendarTour }=await searchParams;
  const {manifest}=await preparedGeneration();
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
        const total=summary.years.reduce((sum,year)=>sum+year.matches,0);
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
    <section className={styles.activity} aria-labelledby="coverage-activity-title">
      <div className={styles.activityIntro}><h2 id="coverage-activity-title">Qué se añade cada día</h2><p>Fecha de incorporación al archivo, no del partido.</p></div>
      <div className={styles.journal}>{days.length?<><ol>{days.slice(0,3).map(day=><PublicationDay key={day.date} day={day}/>)}</ol>{days.length>3&&<details className={styles.previous}><summary>Días anteriores <ChevronDown size={17}/></summary><ol>{days.slice(3).map(day=><PublicationDay key={day.date} day={day}/>)}</ol></details>}</>:<p>Todavía no hay publicaciones registradas.</p>}</div>
    </section>
    <section className={styles.quality} id="calidad" aria-labelledby="coverage-quality-title"><Check size={23} aria-hidden="true"/><div><h2 id="coverage-quality-title">Un archivo en revisión continua</h2><p>Contrastamos los resultados y actualizamos las estadísticas con cada corrección.{review?` Última revisión: ${number(review.references)} resultados contrastados en la web. Quedan ${number(review.afterConfirmed)} incidencias de cuadros en revisión.`:''}</p><details><summary>Cómo interpretar los datos <ChevronDown size={16}/></summary><p>La presencia de un torneo no garantiza que su cuadro esté completo. Las estadísticas de servicio, ranking y punto a punto aparecen únicamente cuando están documentadas. Los resultados pendientes de verificar no se presentan como confirmados.</p><p>Los récords y el palmarés se recalculan al publicar resultados nuevos. Las biografías de Wikipedia/Wikidata pueden completar edades cuando conocemos el día exacto del partido; nunca sustituyen un marcador ni un dato ya recibido del proveedor.</p></details></div></section>
    <CoverageCalendar value={fecha} circuit={calendarTour}/>
    <p className={styles.updated}>Última publicación: <time dateTime={manifest.generatedAt}>{updated}</time>.</p>
  </div>;
}
