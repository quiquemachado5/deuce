import Link from 'next/link';
import { ChevronDown, ArrowUpRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Match } from '@/lib/types';
import { tournamentName, displayPlayerName } from '@/lib/labels';
import { browserCategory, browserRound } from '@/lib/match-browser';
import { roundPosition, chronological, winnerName } from '@/lib/editorial';
import { surfaceLabel } from '@/lib/cuaderno/model';
import { toMatchRecord } from '@/data/map-match';
import { MatchScoreboard } from '@/components/deuce/MatchScoreboard';
import styles from '@/app/buscar/search.module.css';

export type MatchEdition = { key: string; href: string; matches: Match[] };

export default function EditionMatchGroups({ editions, showYears = false }: { editions: MatchEdition[]; showYears?: boolean }) {
  return <div className={styles.editionGroups}>{editions.map(edition => {
    const first = edition.matches[0];
    const category = edition.matches.map(browserCategory).find(Boolean);
    const surfaces = [...new Set(edition.matches.map(match => match.surface))].filter(surface => surface !== 'unknown').map(surface => surfaceLabel[surface]).join(' / ');
    const columns = Math.max(3, ...edition.matches.map(match => match.score_summary.games.length));
    const finals = edition.matches.filter(match => roundPosition(match.round) === 7);
    const final = finals.length === 1 && !['Copa Davis', 'United Cup', 'Laver Cup', 'ATP Cup'].includes(category || '') ? finals[0] : null;
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
          <span className={styles.editionIdentity}><strong>{tournamentName(first.tournament)}{showYears && <span> {first.year}</span>}</strong><small>{[category, surfaces].filter(Boolean).join(' · ')}</small>{champion && <span className={styles.champion}>Ganó {displayPlayerName(champion)}</span>}</span>
          <span className={styles.editionCount} aria-label={`${edition.matches.length} ${edition.matches.length === 1 ? 'partido' : 'partidos'}`}>{edition.matches.length}</span>
          <ChevronDown className={styles.editionChevron} size={19} strokeWidth={1.7} aria-hidden="true" />
        </summary>
        <div className={styles.editionMatches} style={{ '--archive-sets': columns } as CSSProperties}>
          {[...rounds].map(([label, matches]) => <section key={label} aria-label={label || 'Marcadores'} className={styles.roundGroup}>
            <h3 className="deuce-round-heading">{label}</h3>
            <div className="match-archive-grid">{matches.map(match => <MatchScoreboard match={toMatchRecord(match)} key={match.match_id} />)}</div>
          </section>)}
        </div>
      </details>
      <Link className={styles.editionLink} href={edition.href} aria-label={`Ver edición de ${tournamentName(first.tournament)} ${first.year}`}>Ver edición<ArrowUpRight size={14} aria-hidden="true" /></Link>
    </article>;
  })}</div>;
}
