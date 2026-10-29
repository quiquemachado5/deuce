import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Match } from '@/lib/types';
import { toMatchRecord } from '@/data/map-match';
import { ArchiveMatchRow } from './deuce/MatchArchivePage';
import { winnerName } from '@/lib/editorial';
import { playerSlug } from '@/lib/explore';
import { playerPhotoAtTournament } from '@/lib/tournament-media';
import { imageFocus } from '@/lib/image-focus';
import styles from './tournament-detail.module.css';

export default function TournamentFinal({match}:{match:Match;latest?:boolean}) {
  const champion=winnerName(match);
  const opponent=champion ? (match.player1.name===champion?match.player2.name:match.player1.name) : null;
  const photo=champion
    ? playerPhotoAtTournament(champion,match.tournament,[match.year])
    : null;
  return <section className={styles.finalSection} aria-label={`Final ${match.year}`}>
    <h2>La final</h2>
    <div className={styles.finalLayout}>
      <div className={styles.finalScore}>
        <ArchiveMatchRow match={toMatchRecord(match)} showTournamentContext />
      </div>
      {champion&&<Link className={styles.finalPortrait} href={`/jugadores/${playerSlug(champion)}`} aria-label={`Ver perfil de ${champion}`}>
        {photo&&<Image className="art-directed-photo" src={photo.src} alt={photo.alt} fill sizes="(max-width: 759px) 92vw, 31vw" style={imageFocus(photo.objectPosition||'center top',photo.mobileObjectPosition||photo.objectPosition||'center top')} unoptimized/>}
        <span className={styles.photoShade} aria-hidden="true"/>
        <span className={styles.finalPortraitCopy}><small>Campeón · {match.year}</small><strong>{champion}</strong>{opponent&&<span>Final ante {opponent}</span>}</span>
        <span className={styles.finalAction} aria-hidden="true"><ArrowRight size={20}/></span>
      </Link>}
    </div>
  </section>;
}
