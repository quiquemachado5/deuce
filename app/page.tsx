import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { preparedGeneration } from '@/lib/revista/read-records';
import { homeSelection } from '@/lib/deuce-home';
import { HeroVideo } from '@/components/deuce/HeroVideo';
import { OnThisDay } from '@/components/deuce/OnThisDay';
import { MatchScoreboard } from '@/components/deuce/MatchScoreboard';
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
export const revalidate = 300;
export const metadata = { title:'DEUCE — Todo el tenis, partido a partido', description:'Explora el archivo visual del tenis desde 1968: partidos, jugadores, torneos y récords con los datos que los cuentan.', alternates:{canonical:'/'} };
export default async function Home() {
  const generation=await preparedGeneration();
  const matches=await generation.matches();
  const {anniversary,anniversaries,latest}=homeSelection(matches);
  const records=['top-10','mas-juegos','remontada-dos-sets'].flatMap(id=>{const piece=generation.manifest.pieces.find(p=>p.id===id);return piece?.leader?[piece]:[];});
  const tournamentsWithMatches=new Set(matches.map(match=>match.tournament));
  const slides: TournamentSlide[]=TOURNAMENTS.filter(t=>t.category==='Grand Slam'||t.category==='Masters 1000').flatMap(t=>{const image=courtPhoto(t.name);return image&&tournamentsWithMatches.has(t.name)?[{id:t.slug,name:tournamentName(t.name),city:'',surface:t.surface,description:'',image:image.src,alt:image.alt,imagePosition:image.objectPosition,imagePositionMobile:image.mobileObjectPosition,href:`/torneos/${t.slug}`,credit:image.credit,source:image.source}]:[];});
  return <div className="deuce-home">
    <HeroVideo count={generation.manifest.matchCount}/>
    <OnThisDay match={anniversary} matches={anniversaries}/>
    <section className="home-section"><div className="section-head"><h2>Últimos resultados</h2><Link className="deuce-cta" href="/buscar">Ver el archivo <ArrowUpRight size={17} aria-hidden="true"/></Link></div><div className="results floating-results-v2">{latest.map(match=><MatchScoreboard key={match.match_id} match={toMatchRecord(match)} variant="compact"/>)}</div></section>
    {records.length>0&&<section className="dark-section home-records" aria-labelledby="home-records-title"><div className="section-head light"><h2 id="home-records-title">Récords que explican el juego</h2><Link className="deuce-cta" href="/records">Ver récords <ArrowUpRight size={17} aria-hidden="true"/></Link></div><div className="record-showcase">{records.map((piece,index)=>{const leader=piece.leader!,image=recordPhoto(piece.id,leader.photoName||leader.name);return <Link className={`home-record-card home-record-card--${index+1}`} href={`/records?dato=${piece.id}`} key={piece.id}>{image&&<span className="home-record-media"><Image className="art-directed-photo" unoptimized src={image.src} alt={image.alt} fill sizes="(max-width:759px) 92vw, 42vw" style={imageFocus(index===0?'center top':image.objectPosition||'center top',image.mobileObjectPosition||image.objectPosition||'center top')}/></span>}<span className="home-record-shade" aria-hidden="true"/><span className="home-record-copy"><strong className="home-record-value">{leader.display||number(leader.value)}</strong><h3>{piece.title}</h3><span><b>{canonicalName(leader.name)}</b><small>{piece.definition}</small></span></span><ArrowUpRight className="home-record-arrow" size={19} aria-hidden="true"/></Link>;})}</div></section>}
    <TournamentSlider slides={slides}/>
  </div>;
}
