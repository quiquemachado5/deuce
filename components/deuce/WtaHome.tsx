import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import type {prepareCircuitHome} from '@/lib/deuce-home';
import {playerPhoto} from '@/lib/player-imagery';
import {playerSlug} from '@/lib/explore';
import {number} from '@/lib/cuaderno/model';
import {tournamentName} from '@/lib/labels';
import {toMatchRecord} from '@/data/map-match';
import {ArchiveMatchRow} from './MatchArchivePage';
import styles from './wta-home.module.css';

export default function WtaHome({archive}:{archive:ReturnType<typeof prepareCircuitHome>['wta']}){
  const leader=archive.leader,photo=leader?playerPhoto(leader.name,'wta'):null;
  return <section className={`home-section ${styles.section}`} aria-labelledby="home-wta-title">
    <div className="section-head"><div><span className={styles.eyebrow}>Circuito femenino · WTA</span><h2 id="home-wta-title">La otra mitad de la historia.</h2></div><Link className="deuce-cta" href="/wta">Explorar WTA <ArrowUpRight size={17} aria-hidden="true"/></Link></div>
    {archive.count?<><p className={styles.intro}>{number(archive.count)} partidos publicados. Una historia en expansión, con resultados contrastados y lagunas que permanecen visibles.</p><div className={styles.grid}><div><h3>Últimos resultados WTA</h3><div className="home-latest-archive">{archive.latest.map(match=><ArchiveMatchRow key={match.match_id} match={toMatchRecord(match)} showTournamentContext showAction/>)}</div></div><aside className={styles.feature}>{leader&&<><div className={styles.person}>{photo?<Image src={photo.src} alt={photo.alt} width={320} height={400} sizes="(max-width:650px) 140px, 180px" style={{objectPosition:photo.objectPosition||'center 20%'}}/>:<span className={styles.initials} aria-hidden="true">{leader.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span>}<div><span>Más victorias en este archivo WTA</span><h3><Link href={`/jugadores/${playerSlug(leader.name)}?tour=wta`}>{leader.name}</Link></h3><strong>{number(leader.wins)}</strong><p>victorias en {number(leader.played)} partidos publicados</p></div></div>{photo&&<small><a href={photo.source}>{photo.credit}</a> · <a href={photo.licenseUrl}>Licencia</a></small>}<p className={styles.evidence}>Muestra de resultados completos del circuito femenino. <Link href="/records?tour=wta&dato=victorias">Ver clasificación</Link> · <Link href={`/match/${leader.evidenceId}`}>Consultar un partido de evidencia</Link>.</p></>}{archive.edition&&<div className={styles.edition}><span>Una edición para explorar</span><h3>{tournamentName(archive.edition.tournament)} · {archive.edition.year}</h3><Link href={`/match/${archive.edition.match_id}`}>La final publicada →</Link></div>}<Link className={styles.coverage} href="/cobertura#wta-progress-title">Qué se ha incorporado al archivo femenino →</Link></aside></div></>:<p className={styles.intro}>Todavía no hay resultados WTA en esta copia validada. <Link href="/cobertura#wta-progress-title">Consultar el progreso de la incorporación</Link>.</p>}
  </section>;
}
