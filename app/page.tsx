import Image from 'next/image';
import Link from 'next/link';
import {Suspense} from 'react';
import {preparedGeneration,recordView} from '@/lib/revista/read-records';
import Row from '@/components/nocturno/Row';
import ArchiveNotice from '@/components/nocturno/ArchiveNotice';
import HomeHighlights,{type HomeHighlight} from '@/components/HomeHighlights';
import TourActivity from '@/components/TourActivity';
import ScoreText from '@/components/ScoreText';
import {playerPhoto} from '@/lib/player-imagery';
import {playerSlug} from '@/lib/explore';
import {chronological,roundPosition,winnerName} from '@/lib/editorial';
import {number,score} from '@/lib/cuaderno/model';
import {tournamentName} from '@/lib/labels';
import {courtPhotos} from '@/lib/imagery';
import {tournamentDirectory} from '@/lib/tournament-directory';
import {SURFACES,surfaceLabel} from '@/lib/surface';
import './rally-overview.css';

export const revalidate=300;
export default async function Home(){
  const [generation,finals,topTen]=await Promise.all([preparedGeneration(),recordView(JSON.stringify({dato:'finales-ganadas'})),recordView(JSON.stringify({dato:'top-10'}))]);
  const matches=await generation.matches(),manifest=generation.manifest;
  const recent=[...matches].sort((a,b)=>chronological(b,a));
  const featured=recent.find(m=>roundPosition(m.round)===7),events=tournamentDirectory(matches);
  const event=featured?events.find(e=>e.name===featured.tournament):null;
  const ids=['ganar-con-menos-puntos','mas-juegos','remontada-dos-sets','tie-breaks','finales-ganadas','top-10'];
  const slides:HomeHighlight[]=ids.flatMap(id=>{
    const piece=manifest.pieces.find(p=>p.id===id),row=piece?.leader;
    if(!piece||!row)return [];
    const photo=playerPhoto(row.photoName||row.name);
    return [{id,title:piece.title,name:row.name,value:row.display||`${number(row.value)}${piece.percent?' %':''}`,detail:row.detail,sample:`${piece.years} · ${number(piece.sample)} partidos con dato`,href:`/records?dato=${id}`,photo:photo?.src,photoName:row.photoName||row.name}];
  });
  // A stable opening per publication; client-side rotation is random and pausable.
  const start=slides.length?Math.floor(Date.parse(manifest.generatedAt)/3600000)%slides.length:0;
  const highlights=[...slides.slice(start),...slides.slice(0,start)];
  const names=['Novak Djokovic','Rafael Nadal'] as const;
  const pair=matches.filter(m=>(m.player1.name===names[0]&&m.player2.name===names[1])||(m.player1.name===names[1]&&m.player2.name===names[0]));
  const wins=names.map(name=>pair.filter(m=>winnerName(m)===name).length);
  const rows=topTen.rows.slice(0,5),ceiling=Math.max(1,...rows.map(r=>r.value));
  const players=[...new Set(matches.flatMap(m=>[m.player1.name,m.player2.name]))];
  const champions=[...new Set(recent.filter(m=>roundPosition(m.round)===7).slice(0,30).map(winnerName).filter((n):n is string=>!!n))].slice(0,5);
  return <div className="deuce-home ds-home">
    <ArchiveNotice status={generation}/>
    <header className="ds-home-header"><div><p className="dx-eyebrow">DEUCE · EL TENIS, CON PERSPECTIVA</p><h1>Cada partido.<br/><span>Una historia.</span></h1></div><div className="ds-home-intro"><p>Lo que acaba de pasar.<br/>Lo que no deja de sorprender.</p><Link className="dx-button" href="/records">Explora el archivo <span aria-hidden="true">↗</span></Link></div></header>
    <nav className="ds-home-pulse" aria-label="El archivo en cifras"><Link href="/buscar"><strong>{number(matches.length)}</strong><span>partidos</span></Link><Link href="/jugadores"><strong>{number(players.length)}</strong><span>jugadores</span></Link><Link href="/records"><strong>{number(manifest.pieces.length)}</strong><span>estadísticas</span></Link><Link href="/cobertura"><span className="ds-status-dot"/><span>Datos reales · cobertura visible</span><span aria-hidden="true">↗</span></Link></nav>
    <HomeHighlights slides={highlights}/>
    <Suspense fallback={<section className="ds-tour-empty" aria-busy="true">Consultando la última agenda guardada…</section>}><TourActivity matches={matches}/></Suspense>
    <section className="ds-results-section" aria-labelledby="ds-results-title"><div className="dx-section-heading"><div><p className="dx-eyebrow">EL ÚLTIMO PUNTO YA SE JUGÓ</p><h2 id="ds-results-title">Resultados. Sin ruido.</h2></div><Link href="/buscar">Todos los partidos ↗</Link></div><div className="ds-scorecards">{recent.slice(0,3).map(match=><Link className="ds-scorecard" href={`/match/${match.match_id}`} key={match.match_id}><div className="ds-scorecard-top"><span>{tournamentName(match.tournament)}</span><span>Finalizado</span></div>{[match.player1,match.player2].map((p,i)=><div className={`ds-scorecard-player${match.winner===i+1?' ds-scorecard-winner':''}`} key={p.name}><strong>{p.name}</strong><div>{match.score_summary.games.map((set,s)=><span className="ds-game" key={s}>{set[i]}{set[i]<set[1-i]&&score(match).split(', ')[s]?.match(/\((\d+)\)/)&&<sup>{score(match).split(', ')[s].match(/\((\d+)\)/)![1]}</sup>}</span>)}</div></div>)}<div className="ds-scorecard-bottom"><span>{match.round} · {match.year} · {surfaceLabel[match.surface]}</span><span aria-hidden="true">↗</span></div></Link>)}</div></section>
    <div className="ds-home-duo">
      {featured&&<section className="ds-final-feature"><p className="dx-eyebrow">LA ÚLTIMA FINAL DEL ARCHIVO</p><h2>{tournamentName(featured.tournament)} <span>{featured.year}</span></h2><p>{featured.player1.name}<br/><span>contra {featured.player2.name}</span></p><div className="ds-final-big-score"><ScoreText value={score(featured)}/></div><div className="ds-feature-links"><Link href={`/match/${featured.match_id}`}>Leer el partido ↗</Link>{event&&<Link href={`/${event.slug}/${featured.year}`}>Toda la edición ↗</Link>}</div></section>}
      <section className="ds-rivalry-feature"><p className="dx-eyebrow">DOS CARRERAS. UNA RIVALIDAD.</p><h2>Djokovic. Nadal.</h2><div className="ds-rivalry-visual">{names.map((name,i)=>{const photo=playerPhoto(name);return <div key={name}>{photo&&<Image src={photo.thumbnail||photo.src} width={120} height={150} alt="" unoptimized/>}<strong>{wins[i]}</strong><span>{name.split(' ').at(-1)}</span></div>;})}</div><p>{number(pair.length)} enfrentamientos documentados en este archivo.</p><div className="ds-rivalry-splits">{SURFACES.filter(s=>pair.some(m=>m.surface===s)).map(s=>{const values=names.map(n=>pair.filter(m=>m.surface===s&&winnerName(m)===n).length);return <div key={s}><span>{surfaceLabel[s]}</span><div className="ds-split-bar"><i style={{width:`${values[0]/(values[0]+values[1])*100}%`}}/><i style={{width:`${values[1]/(values[0]+values[1])*100}%`}}/></div><strong>{values.join('–')}</strong></div>;})}</div><Link href="/rivalries/novak-djokovic--rafael-nadal">Explorar el cara a cara ↗</Link></section>
    </div>
    <section className="ds-players-section"><div className="dx-section-heading"><div><p className="dx-eyebrow">LOS NOMBRES DEL MOMENTO</p><h2>Sus últimas victorias.<br/>Toda su trayectoria.</h2></div><Link href="/jugadores">Todos los jugadores ↗</Link></div><div className="ds-player-strip">{champions.map(name=>{const photo=playerPhoto(name);return <Link href={`/players/${playerSlug(name)}`} key={name}>{photo?<Image src={photo.thumbnail||photo.src} width={180} height={200} alt="" unoptimized/>:<span className="ds-player-initials">{name.split(' ').map(n=>n[0]).slice(0,2).join('')}</span>}<strong>{name}</strong><span>Campeón reciente en el archivo ↗</span></Link>;})}</div></section>
    <section className="ds-ranking-section"><div className="dx-section-heading"><div><p className="dx-eyebrow">GANAR CUANDO IMPORTA</p><h2>Frente al top 10.</h2></div><Link href="/records?dato=top-10">La clasificación completa ↗</Link></div><p className="ds-chart-explainer">Victorias ante un rival del top 10 según el ranking disponible en la fecha del partido. No incluye encuentros sin ese dato.</p><div className="ds-ranking-chart">{rows.map((row,i)=><Link href={row.href} key={row.name} aria-label={`${row.name}: ${number(row.value)} victorias en ${number(row.sample)} partidos con dato`}><span className="ds-rank-position">{String(i+1).padStart(2,'0')}</span><div className="ds-rank-main"><div><strong>{row.name}</strong><span>{number(row.sample)} partidos con dato</span></div><div className="ds-rank-track"><i style={{width:`${row.value/ceiling*100}%`}}/></div></div><strong className="ds-rank-value">{number(row.value)}</strong></Link>)}</div></section>
    <section className="ds-discover-grid" aria-label="Más formas de explorar"><Link className="ds-discover-compare" href="/comparar"><span className="dx-eyebrow">COMPARADOR</span><h2>El mismo criterio.<br/>Dos trayectorias.</h2><p>Temporada, superficie, edad. Compara con contexto y consulta la muestra completa.</p><div aria-hidden="true"><span>01</span><i>vs</i><span>02</span></div><strong>Empezar una comparación ↗</strong></Link><Link className="ds-discover-court" href="/wimbledon/2008"><Image src={courtPhotos.Wimbledon.src} alt="Pista central de Wimbledon" fill sizes="(max-width:759px) 100vw, 50vw"/><div><span>EDICIONES QUE QUEDAN</span><h2>Wimbledon.<br/>2008.</h2><p>La final y el camino del campeón ↗</p></div></Link></section>
    <div className="ds-home-duo ds-home-bottom"><section className="ds-final-ranking"><p className="dx-eyebrow">CUANDO SOLO QUEDAN DOS</p><h2>Más finales ganadas.</h2><ol>{finals.rows.slice(0,5).map(row=><li key={row.name}><Link href={row.href}>{row.name}<strong>{number(row.value)}</strong></Link></li>)}</ol><p className="ds-update-note">{finals.piece?.years} · este archivo, no toda la carrera.</p><Link href="/records?dato=finales-ganadas">Ver los partidos detrás del dato ↗</Link></section><section className="ds-archive-note"><p className="dx-eyebrow">LA CONFIANZA TAMBIÉN SE MIDE</p><h2>Un dato es mejor<br/>cuando puedes<br/><span>comprobarlo.</span></h2><p>Cada cifra lleva a sus partidos. Cada ausencia se explica. Sin completar la historia con datos inventados.</p><Link href="/cobertura">Cobertura y límites del archivo ↗</Link><p className="ds-update-note">Estadísticas publicadas: {new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',dateStyle:'medium',timeStyle:'short'}).format(new Date(manifest.generatedAt))} · Madrid</p></section></div>
    <details className="ds-more-results"><summary>Más resultados recientes</summary>{recent.slice(3,8).map(m=><Row key={m.match_id} match={m}/>)}</details>
  </div>;
}
