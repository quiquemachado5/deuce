import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Match } from '@/lib/types';
import { toMatchRecord } from '@/data/map-match';
import { MatchScoreboard } from './deuce/MatchScoreboard';
import { winnerName } from '@/lib/editorial';
import { playerSlug } from '@/lib/explore';
import { playerPhoto } from '@/lib/player-imagery';
import { imageFocus } from '@/lib/image-focus';

export default function TournamentFinal({match}:{match:Match;latest?:boolean}) {
  const champion=winnerName(match);
  const opponent=champion ? (match.player1.name===champion?match.player2.name:match.player1.name) : null;
  const photo=champion?playerPhoto(champion):null;
  return <section className="deuce-tournament-final" aria-label={`Final ${match.year}`}>
    <h2>Final {match.year}</h2>
    <div className="td-final-layout">
      <MatchScoreboard match={toMatchRecord(match)}/>
      {champion&&<Link className="td-final-editorial" href={`/jugadores/${playerSlug(champion)}`}>
        {photo&&<Image className="art-directed-photo" src={photo.src} alt={photo.alt} fill sizes="(max-width: 759px) 92vw, 31vw" style={imageFocus(photo.objectPosition||'center top',photo.mobileObjectPosition||photo.objectPosition||'center top')} unoptimized/>}
        <span className="td-final-editorial-shade" aria-hidden="true"/>
        <span className="td-final-editorial-copy"><small>Campeón · {match.year}</small><strong>{champion}</strong>{opponent&&<span>Final ante {opponent}</span>}</span>
        <span className="td-final-editorial-action">Ver perfil <ArrowUpRight size={16} aria-hidden="true"/></span>
      </Link>}
    </div>
  </section>;
}
