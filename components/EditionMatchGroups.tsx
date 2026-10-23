import Link from 'next/link';
import { ChevronDown, ArrowUpRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Match } from '@/lib/types';
import { tournamentName, displayPlayerName } from '@/lib/labels';
import { browserCategory, browserRound } from '@/lib/match-browser';
import { roundPosition, chronological, winnerName } from '@/lib/editorial';
import { score, surfaceLabel } from '@/lib/cuaderno/model';
import { displaySetClosed, tieBreakPoints } from '@/lib/score-display';
import PlayerCountryFlag from './PlayerCountryFlag';
import SetGame from './SetGame';
import styles from '@/app/buscar/search.module.css';

export type MatchEdition = { key: string; href: string; matches: Match[] };

function ArchiveScoreRow({ match, columns }: { match: Match; columns: number }) {
  const ties = tieBreakPoints(match);
  return <Link href={`/match/${match.match_id}`} className={styles.matchRow} aria-label={`${displayPlayerName(match.player1.name)} contra ${displayPlayerName(match.player2.name)}. ${score(match)}.${winnerName(match) ? ` Ganó ${displayPlayerName(winnerName(match)!)}.` : ''} Ver partido`}>
    {[match.player1, match.player2].map((player, side) => <span className={styles.playerRow} data-winner={match.winner === side + 1} key={player.name}>
      <span className={styles.playerName}><PlayerCountryFlag name={player.name} /><span>{displayPlayerName(player.name)}</span>{match.winner === side + 1 && <span className="nc-sr">Ganador</span>}</span>
      {Array.from({ length: columns }, (_, index) => {
        const set = match.score_summary.games[index];
        if (!set) return <span key={index} aria-hidden="true" />;
        const won = displaySetClosed(match, index) && set[side] > set[1 - side];
        return <span className={styles.setScore} data-won={won} key={index}><SetGame games={set[side]} tieBreak={!won ? ties[index] : undefined} /></span>;
      })}
    </span>)}
  </Link>;
}

export default function EditionMatchGroups({ editions, showYears = false }: { editions: MatchEdition[]; showYears?: boolean }) {
  return <div className={styles.editionGroups}>{editions.map(edition => {
    const first = edition.matches[0];
    const category = browserCategory(first);
    const columns = Math.max(3, ...edition.matches.map(match => match.score_summary.games.length));
    const final = edition.matches.find(match => roundPosition(match.round) === 7);
    const champion = final ? winnerName(final) : null;
    const rounds = new Map<string, Match[]>();
    for (const match of [...edition.matches].sort((a, b) => roundPosition(b.round) - roundPosition(a.round) || chronological(b, a))) {
      const label = browserRound(match);
      const rows = rounds.get(label) || [];
      rows.push(match);
      rounds.set(label, rows);
    }
    return <article className={styles.editionGroup} key={edition.key}>
      <details className={styles.editionDisclosure}>
        <summary>
          <span className={styles.editionIdentity}><strong>{tournamentName(first.tournament)}{showYears && <span> {first.year}</span>}</strong><small>{[category, first.surface !== 'unknown' ? surfaceLabel[first.surface] : null].filter(Boolean).join(' · ')}</small>{champion && <span className={styles.champion}>Ganó {displayPlayerName(champion)}</span>}</span>
          <span className={styles.editionCount} aria-label={`${edition.matches.length} partidos`}>{edition.matches.length}</span>
          <ChevronDown className={styles.editionChevron} size={19} strokeWidth={1.7} aria-hidden="true" />
        </summary>
        <div className={styles.editionMatches} style={{ '--archive-sets': columns } as CSSProperties}>
          {[...rounds].map(([label, matches]) => <section key={label} aria-label={label} className={styles.roundGroup}>
            <div className={styles.roundHeading}><h3>{label}</h3>{Array.from({ length: columns }, (_, index) => <span key={index} aria-label={`Set ${index + 1}`}>{index + 1}</span>)}</div>
            {matches.map(match => <ArchiveScoreRow match={match} columns={columns} key={match.match_id} />)}
          </section>)}
        </div>
      </details>
      <Link className={styles.editionLink} href={edition.href} aria-label={`Ver edición de ${tournamentName(first.tournament)} ${first.year}`}>Ver edición<ArrowUpRight size={14} aria-hidden="true" /></Link>
    </article>;
  })}</div>;
}
