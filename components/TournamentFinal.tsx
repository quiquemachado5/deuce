import Image from 'next/image';
import Link from 'next/link';
import type { Match } from '@/lib/types';
import { toMatchRecord } from '@/data/map-match';
import { ArchiveMatchRow } from './deuce/MatchArchivePage';
import { winnerName } from '@/lib/editorial';
import { playerSlug } from '@/lib/explore';
import { playerPhotoAtTournament } from '@/lib/tournament-media';
import { playerPhoto } from '@/lib/player-imagery';
import { imageFocus } from '@/lib/image-focus';
import PlayerAvatar from '@/components/PlayerAvatar';
import styles from './tournament-detail.module.css';

export default function TournamentFinal({match,heading='La final'}:{match:Match;heading?:string;latest?:boolean}) {
  const champion=winnerName(match);
  const photo=champion
    ? match.tour==='wta'?playerPhoto(champion):playerPhotoAtTournament(champion,match.tournament,[match.year])
    : null;
  return <section className={styles.finalSection} id="final-edition" aria-label={`${heading} ${match.year}`}>
    <h2>{heading}</h2>
    <div className={styles.finalLayout}>
      {champion&&<Link className={styles.finalPortrait} href={`/jugadores/${playerSlug(champion)}${match.tour==='wta'?'?tour=wta':''}`} aria-label={`Ver perfil de ${champion}`}>
        {photo?<Image className="art-directed-photo" src={photo.src} alt={photo.alt} fill sizes="(max-width: 759px) 92vw, 28vw" style={imageFocus(photo.objectPosition||'center top',photo.mobileObjectPosition||photo.objectPosition||'center top')} loading="eager" unoptimized/>:<span className={styles.finalAvatar}><PlayerAvatar name={champion} photo={null} size={112}/></span>}
        <span className={styles.photoShade} aria-hidden="true"/>
        <span className={styles.finalPortraitCopy}><small>{match.tour==='wta'?'Campeona':'Campeón'} · {match.year}</small><strong>{champion}</strong></span>
      </Link>}
      <div className={styles.finalScore}>
        <span className={styles.finalCardLabel}>Marcador de la final</span>
        <ArchiveMatchRow match={toMatchRecord(match)} showTournamentContext />
      </div>
    </div>
  </section>;
}
