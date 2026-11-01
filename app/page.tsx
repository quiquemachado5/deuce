import WtaHome from '@/components/deuce/WtaHome';
import {prepareCircuitHome} from '@/lib/deuce-home';
import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { preparedGeneration } from '@/lib/revista/read-records';
import { homeSelection, homeSelectionFromIndex } from '@/lib/deuce-home';
import { HeroVideo } from '@/components/deuce/HeroVideo';
import { OnThisDay } from '@/components/deuce/OnThisDay';
import { ArchiveMatchRow } from '@/components/deuce/MatchArchivePage';
import { TournamentSlider } from '@/components/deuce/TournamentSlider';
import { toMatchRecord } from '@/data/map-match';
import { courtPhoto } from '@/lib/imagery';
import { recordPhoto } from '@/lib/editorial-imagery';
import { imageFocus } from '@/lib/image-focus';
import { number } from '@/lib/cuaderno/model';
import { tournamentName } from '@/lib/labels';
import { TOURNAMENTS } from '@/lib/types';
import { canonicalName } from '@/lib/quality';
import type { TournamentSlide } from '@/types/deuce';
import { StructuredData } from '@/components/StructuredData';
import type { Metadata } from 'next';
// The calendar story must be correct for the first visitor after midnight;
// stale-while-revalidate would deliberately serve the previous day once.
export const dynamic = 'force-dynamic';
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
  const matches=prepared?null:await generation.matches();
  const {anniversary,anniversaries}=prepared?.daily?homeSelectionFromIndex(prepared.daily,today):prepared?.selection||homeSelection(matches||[],today);
  const circuits=generation.manifest.home?.circuits||prepareCircuitHome(matches||await generation.matches());
  const records=['top-10','mas-juegos','remontada-dos-sets'].flatMap(id=>{const piece=generation.manifest.pieces.find(p=>p.id===id);return piece?.leader?[piece]:[];});
  const tournamentsWithMatches=new Set(prepared?.tournaments||matches?.map(match=>match.tournament)||[]);
  const slides: TournamentSlide[]=TOURNAMENTS.filter(t=>t.category==='Grand Slam'||t.category==='Masters 1000').flatMap(t=>{const image=courtPhoto(t.name);return image&&tournamentsWithMatches.has(t.name)?[{id:t.slug,name:tournamentName(t.name),city:'',surface:t.surface,description:'',image:image.src,alt:image.alt,imagePosition:image.objectPosition,imagePositionMobile:image.mobileObjectPosition,href:`/torneos/${t.slug}`,credit:image.credit,source:image.source}]:[];});
  return <div className="deuce-home">
    <StructuredData value={{'@context':'https://schema.org','@type':'Dataset',name:'Archivo de partidos ATP y WTA de DEUCE',description:'Resultados y estadísticas ATP y WTA documentados, con cobertura histórica y lagunas explícitas.',url:'https://deuce-archive.vercel.app/cobertura',inLanguage:'es',dateModified:generation.manifest.generatedAt,version:generation.manifest.version,measurementTechnique:'Resultados publicados y datos del proveedor validados',variableMeasured:['resultado','superficie','ronda','ranking','estadísticas','punto a punto'],distribution:{'@type':'DataDownload',contentUrl:'https://deuce-archive.vercel.app/buscar',encodingFormat:'text/html'},size:generation.manifest.matchCount}}/>
    <HeroVideo count={generation.manifest.matchCount} wtaCount={generation.manifest.summary.tours?.wta ?? 0}/>
    <OnThisDay match={anniversary} matches={anniversaries}/>
    <section className="home-section home-latest-results"><div className="section-head"><h2>Últimos resultados ATP</h2><Link className="deuce-cta" href="/buscar">Ver el archivo <ArrowUpRight size={17} aria-hidden="true"/></Link></div><div className="home-latest-archive">{circuits.atp.latest.map(match=><ArchiveMatchRow key={match.match_id} match={toMatchRecord(match)} showTournamentContext showAction/>)}</div></section>
    <WtaHome archive={circuits.wta}/>
    {records.length>0&&<section className="dark-section home-records" aria-labelledby="home-records-title"><div className="section-head light"><h2 id="home-records-title">Récords que explican el juego</h2><Link className="deuce-cta" href="/records">Ver récords <ArrowUpRight size={17} aria-hidden="true"/></Link></div><div className="record-showcase">{records.map((piece,index)=>{const leader=piece.leader!,image=recordPhoto(piece.id,leader.photoName||leader.name);return <Link className={`home-record-card home-record-card--${index+1}`} href={`/records?dato=${piece.id}&tour=atp`} key={piece.id}>{image&&<span className="home-record-media"><Image className="art-directed-photo" unoptimized src={image.src} alt={image.alt} fill sizes="(max-width:759px) 92vw, 42vw" style={{...imageFocus(index===0?'center top':image.objectPosition||'center top',index===0?'50% 0%':image.mobileObjectPosition||image.objectPosition||'center top'),...(index===0?{transformOrigin:'50% 0%'}:{})}}/></span>}<span className="home-record-shade" aria-hidden="true"/><span className="home-record-copy"><strong className="home-record-value">{leader.display||number(leader.value)}</strong><h3>{piece.title}</h3><b>{canonicalName(leader.name)}</b></span><ArrowUpRight className="home-record-arrow" size={19} aria-hidden="true"/></Link>;})}</div></section>}
    <TournamentSlider slides={slides}/>
  </div>;
}
