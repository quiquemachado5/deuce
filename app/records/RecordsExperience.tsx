/* Récords — Read / Experience. Forest green and black, existing DEUCE type and lime.
 * Real leaders open the page; a ranked list, measured surface bars, asymmetrical
 * match stories and an on-demand directory replace repeated family-card grids.
 * Photographs carry modest desktop depth; reduced motion keeps the same content.
 * Every figure links to its existing circuit-scoped classification. No new claims.
 */
import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArchiveMasthead } from '@/components/deuce/ArchiveMasthead';
import ArchiveFilterBar from '@/components/ArchiveFilterBar';
import { HomeMotion } from '@/components/deuce/HomeMotion';
import { recordValue } from '@/components/nocturno/RecordsViews';
import { homePhoto, homePlayerPhoto } from '@/lib/home-media';
import { playerPhoto } from '@/lib/player-imagery';
import { recordView } from '@/lib/revista/read-records';
import { recordsUrl, recordFilters, type RecordQuery } from '@/lib/records-url';
import type { RecordManifest, RecordMeta } from '@/lib/revista/snapshot';
import { recordIndexModel, recordFamilyLabel, recordViewIds } from './record-page-model';
import { rowForTour } from './record-media';
import { RecordLeaders, RecordsFilm } from './RecordsInteractive';
import styles from './records-experience.module.css';
import { PUBLICATION_CATEGORIES } from '@/lib/publication-scope';
import VerifiedMilestones from './VerifiedMilestones';

function Arrow(){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>}

export default async function RecordsExperience({manifest,query}:{manifest:RecordManifest;query:RecordQuery}){
  const {groups,selected,term,pieces,visibleGroups,overview}=recordIndexModel({...manifest,pieces:manifest.pieces.filter(piece=>piece.leader)},query);
  const tour=query.tour==='wta'?'wta':'atp';
  const coverage=manifest.circuitCoverage?.[tour];
  const years=coverage?.firstYear&&coverage.lastYear?`${coverage.firstYear}–${coverage.lastYear}`:manifest.years.length?`${Math.min(...manifest.years)}–${Math.max(...manifest.years)}`:'';
  const byId=new Map(manifest.pieces.map(piece=>[piece.id,piece]));
  const winners=byId.get('victorias');
  const leader=winners?.leader;
  const heroPhoto=leader?(homePlayerPhoto(leader.name)||playerPhoto(leader.name,tour)):null;
  const marathon=byId.get('mas-juegos');
  const comeback=byId.get(tour==='wta'?'remontada-primer-set':'remontada-dos-sets');
  const comebackPhoto=comeback?.leader?(homePlayerPhoto(comeback.leader.name)||playerPhoto(comeback.leader.name,tour)):null;
  const marathonPhoto=tour==='atp'?homePhoto('isner-mahut'):homePhoto('rubin');
  const views=overview?await Promise.all(recordViewIds(tour).rankingIds.map(dato=>recordView(JSON.stringify({...recordFilters(query),dato})))):[];
  const sets=views.flatMap(view=>view.piece&&view.rows.length?[{
    id:view.piece.id,title:view.piece.title,href:recordsUrl(recordFilters(query),{dato:view.piece.id}),
    label:view.piece.id==='victorias'?'Victorias':view.piece.id==='finales-ganadas'?'Finales':view.piece.id==='partidos-disputados'?'Partidos':'Ante el top 10',
    rows:view.rows.slice(0,8).map((row,index,rows)=>({name:row.name,href:rowForTour(row,tour).href,value:recordValue(row,view.piece!.percent),place:rows.findIndex(entry=>entry.value===row.value)+1||index+1})),
  }]:[]);
  const destination=(piece:RecordMeta)=>recordsUrl(recordFilters(query),{dato:piece.id});
  return <HomeMotion className={styles.world}>
    <div className={styles.experience}><ArchiveMasthead title="Récords" tools={<ArchiveFilterBar
      tone="dark" circuitLabel="Circuito de los récords" panelTitle="Filtrar récords" activeCount={[selected,term].filter(Boolean).length}
      circuits={(['atp','wta'] as const).map(value=>({label:value.toUpperCase(),active:tour===value,href:recordsUrl(query,{tour:value,page:undefined,smallPage:undefined})}))}>
      <form action="/records" method="get" className={styles.filters} role="search">
        <input type="hidden" name="tour" value={tour}/>
        <label>Buscar estadística<input type="search" name="q" defaultValue={query.q||''} placeholder="Estadística o jugador"/></label>
        <label>Familia<select name="grupo" defaultValue={selected}><option value="">Todas</option>{groups.map(group=><option key={group} value={group}>{recordFamilyLabel(group)}</option>)}</select></label>
        <button type="submit">Aplicar filtros</button>
      </form>
    </ArchiveFilterBar>}/>
      <section className={styles.scope} aria-label="Periodo de las estadísticas"><strong>{years}</strong></section>
      {overview&&leader&&winners&&<>
        <section className={styles.cover} aria-labelledby="record-cover-title" data-home-depth="52">
          {heroPhoto&&<Image className={styles.coverPhoto} src={heroPhoto.src} alt={heroPhoto.alt} fill priority quality={88} sizes="(max-width:760px) 100vw, 90vw" style={{objectPosition:heroPhoto.objectPosition}}/>}
          <div className={styles.coverCopy}>
            <h2 id="record-cover-title">La dimensión<br/>de lo extraordinario.</h2>
            <div className={styles.coverRecord}><strong>{recordValue(leader)}</strong><div><p>{winners.title}</p><Link href={rowForTour(leader,tour).href}>{leader.name}</Link></div></div>
            <Link className={styles.action} href={destination(winners)}>Ver la clasificación<Arrow/></Link>
          </div>
          <a className={styles.coverExplore} href="#explorar-records">Explorar estadísticas<Arrow/></a>
        </section>
        {sets.length>0&&<section className={styles.leaders} aria-labelledby="record-leaders-title"><h2 id="record-leaders-title">Los nombres.<br/><span>Las cifras.</span></h2><RecordLeaders sets={sets}/></section>}
        <section className={styles.surfaces} aria-labelledby="records-surfaces-title">
          <div><h2 id="records-surfaces-title">Tres superficies.<br/>Tres formas de dominar.</h2><p>El mayor porcentaje de victorias en cada superficie, con los criterios de cada clasificación.</p></div>
          <div className={styles.surfacePlot}>{[['Dura','hard'],['Tierra','clay'],['Hierba','grass']].map(([label,id])=>{
            const piece=byId.get(`efectividad-${id}`);if(!piece?.leader)return null;
            return <Link key={id} href={destination(piece)} className={styles.surfaceRow} data-surface={id} style={{'--record-share':`${Math.max(0,Math.min(100,piece.leader.value))}%`} as CSSProperties}>
              <div><h3>{label}</h3><strong>{recordValue(piece.leader,true)}</strong></div><div className={styles.track} aria-hidden="true"><span/></div><p>{piece.leader.name}<Arrow/></p>
            </Link>;
          })}</div>
        </section>
        <section className={styles.outliers} aria-labelledby="records-outliers-title">
          <h2 id="records-outliers-title">Cuando el partido<br/>se sale del guion.</h2>
          <div className={styles.outlierGrid}>
            {marathon?.leader&&<Link href={destination(marathon)} className={styles.marathon} data-home-depth="35"><Image src={marathonPhoto.src} alt={marathonPhoto.alt} fill sizes="(max-width:760px) 100vw, 60vw" quality={88}/><div><strong>{recordValue(marathon.leader)}</strong><h3>Juegos en un solo partido.</h3><p>{marathon.leader.name}</p><span>{marathon.leader.detail}<Arrow/></span></div></Link>}
            {comeback?.leader&&<Link href={destination(comeback)} className={styles.comeback}>{comebackPhoto&&<Image src={comebackPhoto.src} alt={comebackPhoto.alt} fill sizes="(max-width:760px) 100vw, 35vw" quality={88}/>}<div><strong>{recordValue(comeback.leader)}</strong><h3>{tour==='wta'?'Remontadas tras perder el primer set.':'Remontadas desde dos sets abajo.'}</h3><p>{comeback.leader.name}<Arrow/></p></div></Link>}
          </div>
        </section>
        <section className={styles.film} aria-label="El tenis, más allá del resultado" data-home-depth="45"><RecordsFilm/><div><p>La tensión se vive.<br/><span>La historia se descubre.</span></p><a className={styles.action} href="#explorar-records">Encuentra tu estadística<Arrow/></a></div></section>
        <VerifiedMilestones tour={tour}/>
      </>}
      <section className={styles.directory} id="explorar-records" aria-labelledby="record-directory-title">
        <div className={styles.directoryHeading}><h2 id="record-directory-title">{selected?recordFamilyLabel(selected):term?'Resultados de búsqueda':'Cada ángulo del juego.'}</h2>{(term||selected)&&<Link href={recordsUrl(recordFilters(query))}>Quitar filtros<Arrow/></Link>}</div>
        {!pieces.length&&<p className={styles.empty}>No hay estadísticas para esta búsqueda. Prueba otro nombre o elimina los filtros.</p>}
        {visibleGroups.map(group=><details className={styles.family} key={`${tour}-${group}`} open={Boolean(selected||term)}><summary><h3>{recordFamilyLabel(group)}</h3><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></summary><div className={styles.familyRows}>{pieces.filter(piece=>piece.group===group).map(piece=><Link href={destination(piece)} key={piece.id}><div><h4>{piece.title}</h4>{piece.leader&&<p>{piece.leader.name}</p>}</div><strong>{piece.leader?recordValue(piece.leader,piece.percent,piece.id==='tal-dia-como-hoy'):'—'}</strong><Arrow/></Link>)}</div></details>)}
        <p className={styles.sourceNote}>Estas estadísticas se calculan con los partidos {tour.toUpperCase()} del archivo: {[...PUBLICATION_CATEGORIES[tour]].join(' · ')}.</p>
        <Link className={styles.method} href="/cobertura">Cómo se calculan estos récords<Arrow/></Link>
      </section>
    </div>
  </HomeMotion>;
}
