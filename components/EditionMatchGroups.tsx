import { ChevronDown } from 'lucide-react';
import type { Match } from '@/lib/types';
import { tournamentName } from '@/lib/labels';
import { toMatchRecord } from '@/data/map-match';
import { ArchiveTournamentCard } from '@/components/deuce/MatchArchivePage';
import styles from '@/app/buscar/search.module.css';

export type MatchEdition = { key: string; href: string; matches: Match[] };

export default function EditionMatchGroups({ editions }: { editions: MatchEdition[]; showYears?: boolean }) {
  const seasons = new Map<number, MatchEdition[]>();
  for (const edition of editions) {
    const year = edition.matches[0]?.year;
    if (!year) continue;
    seasons.set(year, [...(seasons.get(year) || []), edition]);
  }

  return <div className={styles.resultList}>
    {[...seasons].sort(([a], [b]) => b - a).map(([year, season], index) => <details className={styles.seasonGroup} open={index === 0} key={year}>
      <summary className={styles.groupHead}>
        <h2>Temporada {year}</h2>
        <span className={styles.seasonSummaryMeta}>
          <span>{season.length} {season.length === 1 ? 'torneo' : 'torneos'}</span>
          <ChevronDown className={styles.seasonChevron} size={20} aria-hidden="true" />
        </span>
      </summary>
      <div className={styles.archiveBoard}>
        {season.slice(0, 6).map(edition => {
          const first = edition.matches[0];
          return <ArchiveTournamentCard tournament={tournamentName(first.tournament)} matches={edition.matches.map(toMatchRecord)} showContext key={edition.key} />;
        })}
        {season.length > 6 ? <details className={styles.revealTournaments}>
          <summary>Ver {season.length - 6} torneos más</summary>
          <div>{season.slice(6).map(edition => {
            const first = edition.matches[0];
            return <ArchiveTournamentCard tournament={tournamentName(first.tournament)} matches={edition.matches.map(toMatchRecord)} showContext key={edition.key} />;
          })}</div>
        </details> : null}
      </div>
    </details>)}
  </div>;
}
