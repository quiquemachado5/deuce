import Image from 'next/image';
import Link from 'next/link';
import { preparedGeneration } from '@/lib/revista/read-records';
import { homeSelection } from '@/lib/deuce-home';
import { HeroVideo } from '@/components/deuce/HeroVideo';
import { OnThisDay } from '@/components/deuce/OnThisDay';
import { MatchScoreboard } from '@/components/deuce/MatchScoreboard';
import { TournamentSlider } from '@/components/deuce/TournamentSlider';
import { toMatchRecord } from '@/data/map-match';
import { playerPhoto } from '@/lib/player-imagery';
import { courtPhoto } from '@/lib/imagery';
import { winnerName } from '@/lib/editorial';
import { playerSlug } from '@/lib/explore';
import { number } from '@/lib/cuaderno/model';
import { tournamentName } from '@/lib/labels';
import { TOURNAMENTS } from '@/lib/types';
import { surfaceLabel } from '@/lib/surface';
import type { TournamentSlide } from '@/types/deuce';
export const revalidate = 300;
export const metadata = { title:'DEUCE — Todo el tenis, partido a partido', description:'Explora el archivo visual del tenis desde 1968: partidos, jugadores, torneos y récords con los datos que los cuentan.', alternates:{canonical:'/'} };
export default async function Home() {
  const generation=await preparedGeneration();
  const [matches,players]=await Promise.all([generation.matches(),generation.records()]);
  const {anniversary,featured,latest}=homeSelection(matches);
  const photo=featured?playerPhoto(winnerName(featured)||''):null;
  const records=['top-10','mas-juegos','remontada-dos-sets'].flatMap(id=>{const piece=generation.manifest.pieces.find(p=>p.id===id);return piece?.leader?[piece]:[];});
  const people=['Rafael Nadal','Andre Agassi','Andy Murray'].flatMap(name=>{const record=players.find(p=>p.name===name),image=playerPhoto(name);return record&&image?[{record,image}]:[];});
  const slides: TournamentSlide[]=TOURNAMENTS.filter(t=>t.category==='Grand Slam').flatMap(t=>{const image=courtPhoto(t.name);const count=matches.filter(m=>m.tournament===t.name).length;return image&&count?[{id:t.slug,name:tournamentName(t.name),city:({'australian-open':'Melbourne','roland-garros':'París',wimbledon:'Londres','us-open':'Nueva York'} as Record<string,string>)[t.slug],surface:surfaceLabel[t.surface],description:`${number(count)} partidos en el archivo`,image:image.src,alt:image.alt,href:`/torneos/${t.slug}`,credit:image.credit,source:image.source}]:[];});
  return <div className="deuce-home">
    <HeroVideo count={generation.manifest.matchCount}/>
    <OnThisDay match={anniversary}/>
    {featured&&<section className="home-section intro-grid"><div><h2>Una historia.<br/>Cada día.</h2><p>Un partido elegido del archivo para volver a mirar el tenis con calma.</p></div><div className="feature-match">
      {photo&&<Image unoptimized src={photo.src} alt={photo.alt} fill sizes="(max-width:900px) 90vw, 60vw" style={{objectPosition:photo.objectPosition||'center top'}}/>}<div className="feature-overlay"/>
      <span className="chip">{tournamentName(featured.tournament)} · {featured.year}</span><MatchScoreboard match={toMatchRecord(featured)} variant="overlay"/>
      {photo&&<a className="media-credit feature-credit" href={photo.source} target="_blank" rel="noopener noreferrer">Retrato · {photo.credit}</a>}
    </div></section>}
    <section className="home-section"><div className="section-head"><h2>Últimos resultados</h2><Link href="/buscar">Ver el archivo ↗</Link></div><div className="results floating-results-v2">{latest.map(match=><MatchScoreboard key={match.match_id} match={toMatchRecord(match)} variant="compact"/>)}</div></section>
    {records.length>0&&<section className="dark-section"><div className="section-head light"><h2>Récords que explican el juego</h2><Link href="/records">Explorar récords ↗</Link></div><div className="record-showcase">{records.map((piece,index)=>{const leader=piece.leader!,image=playerPhoto(leader.photoName||leader.name);return <Link className={`${index===0?'record-big':index===2?'record-small acid':'record-small'} hover-card`} href={`/records?dato=${piece.id}`} key={piece.id}><strong className="home-record-value">{leader.display||number(leader.value)}</strong><h3>{piece.title}</h3><div>{index===0&&image&&<Image unoptimized src={image.thumbnail||image.src} alt={image.alt} width={48} height={48}/>}<p><b>{leader.name}</b><small>{number(leader.sample)} {piece.percent?'casos':'partidos'} documentados</small></p></div></Link>;})}</div></section>}
    <section className="home-section"><div className="section-head"><h2>Jugadores</h2><Link href="/jugadores">Ver el archivo ↗</Link></div><div className="photo-grid">{people.map(({record,image})=><Link href={`/players/${playerSlug(record.name)}`} className="photo-card hover-card" key={record.name}><Image unoptimized src={image.src} alt={image.alt} width={700} height={840} sizes="(max-width:600px) 90vw, 29vw" style={{objectPosition:image.objectPosition||'center top'}}/><div><h3>{record.name}</h3><p>{number(record.played)} partidos · {number(record.finalsWon)} finales ganadas en el archivo</p></div></Link>)}</div></section>
    <TournamentSlider slides={slides}/>
  </div>;
}
