import {prepareCircuitHome} from '@/lib/deuce-home';
import Image from 'next/image';
import Link from 'next/link';
import { preparedCompactArchive, preparedGeneration } from '@/lib/revista/read-records';
import { homeSelection, homeSelectionFromIndex } from '@/lib/deuce-home';
import { HeroVideo } from '@/components/deuce/HeroVideo';
import { OnThisDay } from '@/components/deuce/OnThisDay';
import { ArchiveMatchRow } from '@/components/deuce/MatchArchivePage';
import { TournamentSlider } from '@/components/deuce/TournamentSlider';
import { toMatchRecord } from '@/data/map-match';
import { courtPhoto } from '@/lib/imagery';
import { recordPhoto } from '@/lib/editorial-imagery';
import { playerPhoto } from '@/lib/player-imagery';
import { imageFocus } from '@/lib/image-focus';
import { number } from '@/lib/cuaderno/model';
import { chronological } from '@/lib/editorial';
import { tournamentName } from '@/lib/labels';
import { TOURNAMENTS } from '@/lib/types';
import { canonicalName } from '@/lib/quality';
import type { TournamentSlide } from '@/types/deuce';
import { StructuredData } from '@/components/StructuredData';
import { SITE_ORIGIN } from '@/lib/site-origin';
import type { Metadata } from 'next';
import editorial from './home-editorial.module.css';
// Publication invalidates the route on demand; this bounds any midnight-only
// calendar drift while keeping the expensive archive shell out of hot requests.
export const revalidate = 300;
const title='DEUCE — El archivo ATP y WTA, partido a partido';
const description='Explora los partidos ATP y WTA publicados en DEUCE: resultados, protagonistas, torneos y récords con evidencia y cobertura visible.';
export const metadata: Metadata = {
  title,
  description,
  alternates:{canonical:'/'},
  openGraph:{title,description,url:'/',type:'website',images:['/opengraph-image']},
  twitter:{card:'summary_large_image',title,description,images:['/opengraph-image']},
};
export default async function Home() {
  const generation=await preparedGeneration();
  const e2eDate=process.env.DEUCE_E2E_DATE;
  const today=e2eDate&&Number.isFinite(Date.parse(e2eDate))?new Date(e2eDate):new Date();
  const prepared=generation.manifest.home?.daily||generation.manifest.home?.date===today.toISOString().slice(0,10)?generation.manifest.home:null;
  const matches=prepared?null:await preparedCompactArchive('all');
  const {anniversary,anniversaries}=prepared?.daily?homeSelectionFromIndex(prepared.daily,today):prepared?.selection||homeSelection(matches||[],today);
  const circuits=generation.manifest.home?.circuits||prepareCircuitHome(matches||await preparedCompactArchive('all'));
  const latestResults=[
    ...circuits.atp.latest.map(match=>({tour:'atp' as const,match})),
    ...circuits.wta.latest.map(match=>({tour:'wta' as const,match})),
  ].sort((a,b)=>chronological(b.match,a.match));
  const recordCards=[
    {tour:'atp' as const,pieces:generation.manifest.circuitPieces?.atp||generation.manifest.pieces,ids:['top-10','mas-juegos','remontada-dos-sets']},
    {tour:'wta' as const,pieces:generation.manifest.circuitPieces?.wta||[],ids:['victorias','mas-juegos','remontada-primer-set']},
  ].flatMap(group=>group.ids.flatMap((id,position)=>{
    const piece=group.pieces.find(candidate=>candidate.id===id);
    return piece?.leader?[{piece,position,tour:group.tour}]:[];
  }));
  const tournamentsWithMatches=new Set(prepared?.tournaments||matches?.map(match=>match.tournament)||[]);
  const slides: TournamentSlide[]=TOURNAMENTS.filter(t=>t.category==='Grand Slam'||t.category==='Masters 1000').flatMap(t=>{const image=courtPhoto(t.name);return image&&tournamentsWithMatches.has(t.name)?[{id:t.slug,name:tournamentName(t.name),city:'',surface:t.surface,description:'',image:image.src,alt:image.alt,imagePosition:image.objectPosition,imagePositionMobile:image.mobileObjectPosition,href:`/torneos/${t.slug}`,credit:image.credit,source:image.source}]:[];});
  return <div className="deuce-home">
    <StructuredData value={{'@context':'https://schema.org','@type':'Dataset',name:'Archivo de partidos ATP y WTA de DEUCE',description:'Resultados ATP y WTA publicados; ranking, estadísticas y punto a punto solo cuando la fuente los aporta.',url:`${SITE_ORIGIN}/cobertura`,inLanguage:'es',dateModified:generation.manifest.generatedAt,version:generation.manifest.version,measurementTechnique:'Resultados publicados y campos del proveedor validados sin completar lagunas',variableMeasured:['resultado','superficie','ronda','ranking cuando está disponible','estadísticas cuando están disponibles','punto a punto cuando está disponible'],isAccessibleForFree:true,size:generation.manifest.matchCount}}/>
    <HeroVideo count={generation.manifest.matchCount} wtaCount={generation.manifest.summary.tours?.wta ?? 0} atpFrom={generation.manifest.circuitCoverage?.atp.firstYear} wtaFrom={generation.manifest.circuitCoverage?.wta.firstYear}/>
    <OnThisDay match={anniversary} matches={anniversaries}/>
    {latestResults.length>0&&<section className="home-section home-latest-results" aria-labelledby="latest-results-title">
      <div className="section-head"><h2 id="latest-results-title">Últimos resultados</h2><Link className="deuce-cta" href="/buscar">Ver todos los partidos <span aria-hidden="true">↗</span></Link></div>
      <div className="home-latest-archive">{latestResults.map(({tour,match})=><div className={editorial.latestResult} data-tour={tour} key={`${tour}-${match.match_id}`}><span className={editorial.tourBadge}>{tour.toUpperCase()}</span><ArchiveMatchRow match={toMatchRecord(match)} showTournamentContext/></div>)}</div>
    </section>}
    {recordCards.length>0&&<section className="dark-section home-records" aria-labelledby="home-records-title">
      <div className="section-head light"><h2 id="home-records-title">Récords del archivo</h2><Link className="deuce-cta" href="/records">Explorar récords <span aria-hidden="true">↗</span></Link></div>
      <div className={`record-showcase ${editorial.recordShowcase}`}>{recordCards.map(({piece,position,tour},index)=>{const leader=piece.leader!,image=tour==='wta'?playerPhoto(leader.photoName||leader.name,'wta'):recordPhoto(piece.id,leader.photoName||leader.name);const variant=index===0?1:index===2?3:2;return <Link className={`home-record-card home-record-card--${variant}`} data-tour={tour} href={`/records?dato=${piece.id}&tour=${tour}`} key={`${tour}-${piece.id}`}>{image&&<span className="home-record-media"><Image className="art-directed-photo" unoptimized src={image.src} alt={image.alt} fill sizes="(max-width:759px) 84vw, 42vw" style={{...imageFocus(position===0?'center top':image.objectPosition||'center top',position===0?'50% 0%':image.mobileObjectPosition||image.objectPosition||'center top'),...(position===0?{transformOrigin:'50% 0%'}:{})}}/></span>}<span className="home-record-shade" aria-hidden="true"/><span className="home-record-copy"><small className={editorial.recordTour}>{tour.toUpperCase()}</small><strong className="home-record-value">{leader.display||number(leader.value)}</strong><h3>{piece.title}</h3><b>{canonicalName(leader.name)}</b></span><span className={`home-record-arrow ${editorial.recordArrow}`} aria-hidden="true">↗</span></Link>;})}</div>
    </section>}
    <TournamentSlider slides={slides}/>
  </div>;
}
