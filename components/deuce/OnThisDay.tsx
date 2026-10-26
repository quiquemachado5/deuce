import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Match } from '@/lib/types';
import { winnerName } from '@/lib/editorial';
import { playerPhoto } from '@/lib/player-imagery';
import { tournamentName } from '@/lib/labels';
import { browserRound } from '@/lib/match-browser';
import { scoreFor } from '@/lib/editorial';
import { canonicalName } from '@/lib/quality';
export function OnThisDay({ match, matches = [] }: { match?:Match; matches?:Match[] }) {
  if(!match)return null;
  const winner=winnerName(match)!;
  const loser=match.player1.name===winner?match.player2.name:match.player1.name;
  const photo=playerPhoto(winner);
  const date=new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(match.context!.date!));
  const otherMatches=matches.filter(item=>item.match_id!==match.match_id).slice(0,3);
  return <section className="home-section legacy-daily">
    <div className="legacy-daily-head"><h2>Tal día<br/>como hoy</h2><p>{date}</p></div>
    <article className={`legacy-daily-card${photo?'':' without-photo'}`}><div className="legacy-daily-copy">
      <span className="legacy-daily-year">’{String(match.year).slice(-2)}</span><h3>{canonicalName(winner)} ganó a {canonicalName(loser)} en {tournamentName(match.tournament)}</h3>
      <p>{browserRound(match)} · {scoreFor(match,winner)}. Un resultado conservado en el archivo para volver a leer aquel encuentro.</p><Link href={`/match/${match.match_id}`}>Revivir el partido <ArrowUpRight size={20} aria-hidden="true"/></Link>
    </div>{photo&&<div className="legacy-daily-photo"><Image unoptimized src={photo.src} alt={photo.alt} fill sizes="(max-width:800px) 90vw, 42vw" style={{objectPosition:photo.objectPosition||'center top'}}/></div>}</article>
    {otherMatches.length>0&&<div className="legacy-daily-archive" aria-label="Otros partidos disputados este día">{otherMatches.map(item=>{const itemWinner=winnerName(item)!;const itemLoser=item.player1.name===itemWinner?item.player2.name:item.player1.name;return <Link href={`/match/${item.match_id}`} key={item.match_id}><span>{item.year} · {tournamentName(item.tournament)}</span><strong>{canonicalName(itemWinner)} contra {canonicalName(itemLoser)}</strong><small>{browserRound(item)} · {scoreFor(item,itemWinner)}</small><ArrowUpRight size={17} aria-hidden="true"/></Link>})}</div>}
  </section>;
}
