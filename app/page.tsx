import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { preparedCompactArchive, preparedCompactSelection, preparedGeneration } from '@/lib/revista/read-records';
import { homeRecentResults, homeSelection, homeSelectionFromIndex } from '@/lib/deuce-home';
import { HeroVideo } from '@/components/deuce/HeroVideo';
import { HomeMotion } from '@/components/deuce/HomeMotion';
import { OnThisDay } from '@/components/deuce/OnThisDay';
import { ArchiveMatchRow } from '@/components/deuce/MatchArchivePage';
import { HomeVenues } from '@/components/deuce/HomeVenues';
import { HomeRivalry, HomeCourtExplorer, HomeCinema } from '@/components/deuce/HomeDiscoveries';
import { tournamentEditionMedia } from '@/lib/tournament-media';
import { toMatchRecord } from '@/data/map-match';
import { courtPhoto } from '@/lib/imagery';
import { tournamentDetailFeaturePhoto } from '@/lib/tournament-detail-media';
import { recordPhoto } from '@/lib/editorial-imagery';
import { playerPhoto } from '@/lib/player-imagery';
import { imageFocus } from '@/lib/image-focus';
import { homePhoto, homePlayerPhoto, type HomeMediaKey } from '@/lib/home-media';
import { number } from '@/lib/cuaderno/model';
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
  const newestYear=generation.manifest.years.length?Math.max(...generation.manifest.years):today.getUTCFullYear();
  const recentPool=matches||await preparedCompactSelection({tour:'all',fromYear:newestYear-1,toYear:newestYear});
  const latestResults=homeRecentResults(recentPool,today).map(match=>({tour:match.tour==='wta'?'wta' as const:'atp' as const,match}));
  const recordCards=[
    {tour:'atp' as const,pieces:generation.manifest.circuitPieces?.atp||generation.manifest.pieces,ids:['top-10','mas-juegos','remontada-dos-sets']},
    {tour:'wta' as const,pieces:generation.manifest.circuitPieces?.wta||[],ids:['victorias','mas-juegos','remontada-primer-set']},
  ].flatMap(group=>group.ids.flatMap((id,position)=>{
    const piece=group.pieces.find(candidate=>candidate.id===id);
    return piece?.leader?[{piece,position,tour:group.tour}]:[];
  }));
  const tournamentsWithMatches=new Set(prepared?.tournaments||matches?.map(match=>match.tournament)||[]);
  const venueKeys:Record<string,HomeMediaKey>={'Australian Open':'australian-open','Roland Garros':'roland-garros','Wimbledon':'wimbledon','US Open':'us-open','Indian Wells':'indian-wells','Miami':'miami','Monte Carlo':'monte-carlo','Madrid':'madrid','Rome':'rome','Canada':'canada','Cincinnati':'cincinnati','Shanghai':'shanghai','Paris':'paris'};
  const slides: TournamentSlide[]=TOURNAMENTS.filter(t=>t.category==='Grand Slam'||t.category==='Masters 1000').flatMap(t=>{const key=venueKeys[t.name];const image=key?homePhoto(key):tournamentDetailFeaturePhoto(t.name)||courtPhoto(t.name);return image&&tournamentsWithMatches.has(t.name)?[{id:t.slug,name:tournamentName(t.name),city:'',surface:t.surface,description:'',image:image.src,alt:image.alt,imagePosition:image.objectPosition,imagePositionMobile:image.mobileObjectPosition,href:`/torneos/${t.slug}`,credit:image.credit,source:image.source}]:[];});
  const federer=homePhoto('federer'),nadal=homePhoto('nadal');
  const courts=[{key:'hard',name:'Dura',venue:'Nueva York',photo:homePhoto('us-open')},{key:'clay',name:'Tierra',venue:'París',photo:homePhoto('roland-garros')},{key:'grass',name:'Hierba',venue:'Wimbledon',photo:homePhoto('wimbledon')}];
  const film=tournamentEditionMedia[0];
  return <HomeMotion className={`deuce-home ${editorial.home}`}>
    <StructuredData value={{'@context':'https://schema.org','@type':'Dataset',name:'Archivo de partidos ATP y WTA de DEUCE',description:'Resultados ATP y WTA publicados; ranking, estadísticas y punto a punto solo cuando la fuente los aporta.',url:`${SITE_ORIGIN}/cobertura`,inLanguage:'es',datePublished:generation.manifest.generatedAt,version:generation.manifest.version,measurementTechnique:'Resultados publicados y campos del proveedor validados sin completar lagunas',variableMeasured:['resultado','superficie','ronda','ranking cuando está disponible','estadísticas cuando están disponibles','punto a punto cuando está disponible'],isAccessibleForFree:true,size:generation.manifest.matchCount}}/>
    <HeroVideo/>
    <section className={editorial.introduction} id="descubrir"><h2><span className={editorial.desktopTitle}>La emoción se vive.<br/><em>La historia se explora.</em></span><span className={editorial.mobileTitle}>Encuentra<br/>tu tenis.</span></h2><div className={editorial.introBody}><p>Jugadores, rivalidades y escenarios. Conecta cada resultado con todo lo que vino antes.</p><div className={editorial.quickLinks}>{[{title:'Jugadores',href:'/jugadores',photo:nadal},{title:'Cara a cara',href:'/comparar',photo:federer},{title:'Una fecha',href:'/cobertura#por-fecha',photo:homePhoto('wimbledon')}].map(item=><Link href={item.href} key={item.href}>{item.photo&&<span className={editorial.shortcutPhoto}><Image src={item.photo.thumbnail||item.photo.src} alt="" fill sizes="(max-width:759px) 100px, 1px" style={{objectPosition:item.photo.objectPosition||'center'}}/></span>}<span>{item.title}</span><ArrowUpRight size={20}/></Link>)}</div></div></section>
    {latestResults.length>0&&<section className={editorial.latestSection} aria-labelledby="latest-results-title">
      <div className={editorial.sectionHead}><h2 id="latest-results-title"><span className={editorial.desktopTitle}>Últimos resultados</span><span className={editorial.mobileTitle}>En la pista.</span></h2><Link className={editorial.sectionCta} href="/partidos" aria-label="Ver todos los partidos"><span>Todos</span><ArrowUpRight size={19} strokeWidth={1.8} aria-hidden="true"/></Link></div>
      <div className={editorial.latestArchive}>{latestResults.map(({tour,match})=><div className={editorial.latestResult} data-tour={tour} key={`${tour}-${match.match_id}`}><ArchiveMatchRow match={toMatchRecord(match)} showTournamentContext/></div>)}</div>
    </section>}
    {federer&&nadal&&<HomeRivalry first={federer} second={nadal}/>}
    <div className={editorial.daily}><OnThisDay match={anniversary} matches={anniversaries}/></div>
    {recordCards.length>0&&<section className={editorial.recordsSection} aria-labelledby="home-records-title">
      <div className={editorial.recordsLayout}><div className={editorial.recordsIntro}><h2 id="home-records-title"><span className={editorial.desktopTitle}>Fuera de<br/>lo común.</span><span className={editorial.mobileTitle}>Sin precedentes.</span></h2><p>Los nombres y las cifras que cambian la escala del tenis.</p><Link className={editorial.textAction} href="/records" aria-label="Explorar los récords"><span className={editorial.desktopTitle}>Explorar los récords</span><span className={editorial.mobileTitle}>Todos</span><ArrowUpRight size={20}/></Link></div>
      <div className={editorial.recordShowcase}>{recordCards.map(({piece,tour})=>{const leader=piece.leader!;const image=tour==='atp'&&piece.id==='mas-juegos'?homePhoto('isner-mahut'):homePlayerPhoto(leader.photoName||leader.name)||(tour==='wta'?playerPhoto(leader.photoName||leader.name,'wta'):recordPhoto(piece.id,leader.photoName||leader.name));return <Link className={editorial.recordCard} data-home-depth="36" data-tour={tour} href={`/records?dato=${piece.id}&tour=${tour}`} key={`${tour}-${piece.id}`}>{image&&<span className={editorial.recordMedia}><Image className="art-directed-photo" src={image.src} alt={image.alt} fill sizes="(max-width:759px) 82vw, 32vw" style={imageFocus(image.objectPosition||'center top',image.mobileObjectPosition||image.objectPosition||'center top')}/></span>}<span className={editorial.recordShade} aria-hidden="true"/><span className={editorial.recordCopy}><small>{tour.toUpperCase()} · {canonicalName(leader.name)}</small><strong>{leader.display||number(leader.value)}</strong><h3>{piece.title}</h3></span><span className={editorial.recordArrow} aria-hidden="true"><ArrowUpRight size={22}/></span></Link>;})}</div></div>
    </section>}
    <HomeCourtExplorer courts={courts}/>
    {film&&<HomeCinema film={film.video} photo={homePhoto('rg-final')}/>}
    <HomeVenues slides={slides}/>
    <section className={editorial.close}><h2>Tu próxima gran<br/>rivalidad empieza aquí.</h2><Link className={editorial.primaryAction} href="/comparar">Comparar jugadores <ArrowUpRight size={22}/></Link></section>
  </HomeMotion>;
}
