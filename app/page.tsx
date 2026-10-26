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
import { playerPhoto } from '@/lib/player-imagery';
import { number } from '@/lib/cuaderno/model';
import { tournamentName } from '@/lib/labels';
import { TOURNAMENTS } from '@/lib/types';
import { surfaceLabel } from '@/lib/surface';
import type { TournamentSlide } from '@/types/deuce';
export const revalidate = 300;
export const metadata = { title:'DEUCE — Todo el tenis, partido a partido', description:'Explora el archivo visual del tenis desde 1968: partidos, jugadores, torneos y récords con los datos que los cuentan.', alternates:{canonical:'/'} };
export default async function Home() {
  const generation=await preparedGeneration();
  const matches=await generation.matches();
  const {anniversary,latest}=homeSelection(matches);
  const records=['top-10','mas-juegos','remontada-dos-sets'].flatMap(id=>{const piece=generation.manifest.pieces.find(p=>p.id===id);return piece?.leader?[piece]:[];});
  const slides: TournamentSlide[]=TOURNAMENTS.filter(t=>t.category==='Grand Slam').flatMap(t=>{const image=courtPhoto(t.name);const count=matches.filter(m=>m.tournament===t.name).length;return image&&count?[{id:t.slug,name:tournamentName(t.name),city:({'australian-open':'Melbourne','roland-garros':'París',wimbledon:'Londres','us-open':'Nueva York'} as Record<string,string>)[t.slug],surface:surfaceLabel[t.surface],description:`${number(count)} partidos en el archivo`,image:image.src,alt:image.alt,href:`/torneos/${t.slug}`,credit:image.credit,source:image.source}]:[];});
  return <div className="deuce-home">
    <HeroVideo count={generation.manifest.matchCount}/>
    <section className="home-archive-tools" aria-labelledby="home-tools-title"><div><p>Archivo verificable</p><h2 id="home-tools-title">Encuentra un partido sin recorrer toda la web</h2></div><form action="/buscar" role="search"><label className="nc-sr" htmlFor="home-archive-search">Buscar en el archivo</label><input id="home-archive-search" name="q" type="search" placeholder="Jugador, torneo, año o ronda" required/><button type="submit">Buscar</button></form><nav aria-label="Entradas al archivo"><Link href="/buscar"><span>Partidos</span><strong>{number(generation.manifest.matchCount)}</strong><small>desde 1968</small><ArrowUpRight size={18} aria-hidden="true"/></Link><Link href="/jugadores"><span>Jugadores</span><strong>Perfiles</strong><small>resultados y cara a cara</small><ArrowUpRight size={18} aria-hidden="true"/></Link><Link href="/records"><span>Récords</span><strong>{number(generation.manifest.pieces.length)}</strong><small>estadísticas calculadas</small><ArrowUpRight size={18} aria-hidden="true"/></Link><Link href="/torneos"><span>Torneos</span><strong>Por nivel</strong><small>Grand Slams, Masters y ATP 500</small><ArrowUpRight size={18} aria-hidden="true"/></Link></nav></section>
    <OnThisDay match={anniversary}/>
    <section className="home-section"><div className="section-head"><h2>Últimos resultados</h2><Link href="/buscar">Ver el archivo <ArrowUpRight size={17} aria-hidden="true"/></Link></div><div className="results floating-results-v2">{latest.map(match=><MatchScoreboard key={match.match_id} match={toMatchRecord(match)} variant="compact"/>)}</div></section>
    {records.length>0&&<section className="dark-section"><div className="section-head light"><h2>Récords que explican el juego</h2><Link href="/records">Explorar récords <ArrowUpRight size={17} aria-hidden="true"/></Link></div><div className="record-showcase">{records.map((piece,index)=>{const leader=piece.leader!,image=playerPhoto(leader.photoName||leader.name);return <Link className={`${index===0?'record-big':index===2?'record-small acid':'record-small'} hover-card`} href={`/records?dato=${piece.id}`} key={piece.id}><strong className="home-record-value">{leader.display||number(leader.value)}</strong><h3>{piece.title}</h3><div>{index===0&&image&&<Image unoptimized src={image.thumbnail||image.src} alt={image.alt} width={48} height={48}/>}<p><b>{leader.name}</b><small>{number(leader.sample)} {piece.percent?'casos':'partidos'} documentados</small></p></div></Link>;})}</div></section>}
    <TournamentSlider slides={slides}/>
  </div>;
}
