import Image from 'next/image';
import Link from 'next/link';
import type { Match } from '@/lib/types';
import { winnerName } from '@/lib/editorial';
import { playerPhoto } from '@/lib/player-imagery';
import { tournamentName } from '@/lib/labels';
import { browserRound } from '@/lib/match-browser';
import { score } from '@/lib/cuaderno/model';
export function OnThisDay({ match }: { match?:Match }) {
  if(!match)return null;
  const winner=winnerName(match)!;
  const loser=match.player1.name===winner?match.player2.name:match.player1.name;
  const photo=playerPhoto(winner);
  const date=new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(match.context!.date!));
  return <section className="home-section legacy-daily">
    <div className="legacy-daily-head"><h2>Tal día<br/>como hoy</h2><p>{date}</p></div>
    <article className={`legacy-daily-card${photo?'':' without-photo'}`}><div className="legacy-daily-copy">
      <span className="legacy-daily-year">’{String(match.year).slice(-2)}</span><h3>{winner} ganó a {loser} en {tournamentName(match.tournament)}</h3>
      <p>{browserRound(match)} · {score(match)}. Un resultado conservado en el archivo para volver a leer aquel encuentro.</p><Link href={`/match/${match.match_id}`}>Revivir el partido <span aria-hidden="true">↗</span></Link>
    </div>{photo&&<div className="legacy-daily-photo"><Image unoptimized src={photo.src} alt={photo.alt} fill sizes="(max-width:800px) 90vw, 42vw" style={{objectPosition:photo.objectPosition||'center top'}}/><a href={photo.source} className="media-credit" target="_blank" rel="noopener noreferrer">{photo.credit}</a></div>}</article>
  </section>;
}
