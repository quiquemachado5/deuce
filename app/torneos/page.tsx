import { ArchiveMasthead } from '@/components/deuce/ArchiveMasthead';
import type {Metadata} from 'next';
import Link from 'next/link';
import ArchiveFilterBar from '@/components/ArchiveFilterBar';
import {HomeMotion} from '@/components/deuce/HomeMotion';
import {TournamentDirectoryStudy} from '@/components/tournament/TournamentDirectoryStudy';
import {preparedCompactSelection} from '@/lib/revista/read-records';
import {tournamentDirectory} from '@/lib/tournament-directory';
import {tournamentMarkFor} from '@/lib/tournament-branding';
import {tournamentName} from '@/lib/labels';
import {courtPhoto} from '@/lib/imagery';
import {isCurrentTournament} from '@/lib/tournament-calendar-status';
import {calendarOrder} from '@/lib/presentation-calendar';
import {latestTournamentCourt} from '@/lib/tournament-presentation';
import {singlesMatches} from '@/lib/match-discipline';
import {homePhoto} from '@/lib/home-media';
import styles from '../jugadores/player-index.module.css';
export const metadata:Metadata={title:'Torneos ATP y WTA: Grand Slam, 1000, 500 y 250 — DEUCE',description:'Explora torneos ATP y WTA, sus campeones, estadísticas, ediciones y cuadros históricos.',alternates:{canonical:'/torneos',languages:{es:'/torneos',en:'/en/tournaments'}},openGraph:{title:'Torneos ATP y WTA — DEUCE',description:'Campeones, cuadros, ediciones y estadísticas del tenis.',url:'/torneos',images:['/opengraph-image']},twitter:{card:'summary_large_image',title:'Torneos ATP y WTA — DEUCE',images:['/opengraph-image']}};
export default async function TournamentProposal({searchParams}:{searchParams:Promise<{tour?:string;circuito?:string;categoria?:string}>}){
  const query=await searchParams,tour=(query.tour||query.circuito)==='wta'?'wta':'atp',levels=tour==='wta'?['Grand Slam','WTA Finals','WTA 1000','WTA 500','WTA 250']:['Grand Slam','ATP Finals','Masters 1000','ATP 500','ATP 250'];
  const entries=calendarOrder(tournamentDirectory(singlesMatches(await preparedCompactSelection({tour,rounds:['Final']}))));
  // Historical Australian Championships remain preserved in the archive, not as a fifth Slam card.
  const venues=entries.filter(entry=>entry.name!=='Australian Championships').flatMap(entry=>{const category=levels.find(level=>entry.categories.includes(level));return category&&(!query.categoria||category===query.categoria)?[{slug:entry.slug,name:tournamentName(entry.name),category,surface:latestTournamentCourt(entry.matches.filter(m=>m.category===category)).surface,latestYear:entry.latestYear,current:isCurrentTournament(entry.name,tour,category),photo:courtPhoto(entry.name),logo:tournamentMarkFor(entry.name,tour).src,href:'/torneos/'+entry.slug+'?cuadro='+tour+'&categoria='+encodeURIComponent(category)}]:[];});
  const ordered=venues.sort((a,b)=>levels.indexOf(a.category)-levels.indexOf(b.category)).map(venue=>({...venue,photo:venue.slug==='australian-open'?homePhoto('australian-open'):venue.slug==='roland-garros'?homePhoto('roland-garros'):venue.slug==='wimbledon'?homePhoto('wimbledon'):venue.slug==='us-open'?homePhoto('us-open'):venue.photo}));
  return <HomeMotion className={styles.page}><ArchiveMasthead title="Torneos" tools={<ArchiveFilterBar circuitLabel="Circuito de torneos" panelTitle="Filtrar torneos" circuits={['atp','wta'].map(value=>({label:value.toUpperCase(),href:'/torneos?tour='+value,active:value===tour}))} activeCount={query.categoria?1:0}><nav className={styles.filters} aria-label="Categoría"><Link href={'/torneos?tour='+tour} aria-current={!query.categoria?'page':undefined}>Todas las categorías</Link>{levels.map(level=><Link key={level} aria-current={query.categoria===level?'page':undefined} href={'/torneos?tour='+tour+'&categoria='+encodeURIComponent(level)}>{level}</Link>)}</nav></ArchiveFilterBar>}/><TournamentDirectoryStudy key={tour+'|'+query.categoria} venues={ordered}/></HomeMotion>;
}
