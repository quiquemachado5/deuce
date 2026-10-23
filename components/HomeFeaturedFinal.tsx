import Image from 'next/image';
import Link from 'next/link';
import type { Match } from '@/lib/types';
import { playerPhoto } from '@/lib/player-imagery';
import { displayPlayerName, tournamentName } from '@/lib/labels';
import { visibleTournamentCategory } from '@/lib/tournament-tier';
import { score } from '@/lib/cuaderno/model';
import { surfaceLabel } from '@/lib/surface';
import SetScoreboard from './SetScoreboard';
import PhotoInfo from './PhotoInfo';

export default function HomeFeaturedFinal({ match }: { match: Match }) {
  const winner = match.winner === 1 ? match.player1.name : match.winner === 2 ? match.player2.name : null;
  const photo = winner ? playerPhoto(winner) : null;
  const category = visibleTournamentCategory(match.category, match.tournament, match.year);
  return <section className="home-featured" aria-labelledby="home-featured-title">
    <div className="home-featured-copy">
      <span className="home-featured-kicker">Una final del archivo</span>
      <h2 id="home-featured-title">{tournamentName(match.tournament)} <span>{match.year}</span></h2>
      <p className="home-featured-context">Final · {surfaceLabel[match.surface]}{category ? ` · ${category}` : ''}</p>
      {winner && <p className="home-featured-winner">Ganó <strong>{displayPlayerName(winner)}</strong></p>}
      <SetScoreboard match={match} compact />
      <Link className="home-featured-link" href={`/match/${match.match_id}`} aria-label={`Ver la final de ${tournamentName(match.tournament)} ${match.year}: ${score(match)}`}>Ver partido <span aria-hidden="true">↗</span></Link>
    </div>
    <div className="home-featured-image">
      {photo ? <><Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 760px) 100vw, 48vw" priority unoptimized /><span className="home-featured-image-label">Retrato de {displayPlayerName(winner || '')}</span><PhotoInfo photo={photo} /></> : <span className="home-featured-monogram" aria-hidden="true">{winner?.split(' ').map(part => part[0]).slice(-2).join('') || 'DEUCE'}</span>}
    </div>
  </section>;
}
