import Link from 'next/link';
import type { MatchRecord } from '@/types/deuce';
import { MatchScoreboard } from './MatchScoreboard';
import { matchDatePresentation } from '@/lib/match-date';
import styles from '@/app/buscar/search.module.css';
import { ChevronDown } from 'lucide-react';

function matchDate(match: MatchRecord) {
  return matchDatePresentation({
    date: match.date,
    dateLabel: match.dateLabel,
    year: match.year,
    tournament: match.tournament,
  });
}

export function ArchiveMatchRow({match,prefetch=false}:{match:MatchRecord;showContext?:boolean;showTournamentContext?:boolean;showAction?:boolean;prefetch?:boolean}) {
  return <MatchScoreboard match={match} prefetch={prefetch}/>;
}

export function ArchiveTournamentCard({ tournament, matches, totalMatches = matches.length, href, showContext = false }: { tournament: string; matches: MatchRecord[]; totalMatches?: number; href?: string; showContext?: boolean }) {
  const category = matches.find(match => match.category)?.category || '';
  const round = [...new Set(matches.map(match => match.round).filter(Boolean))];
  const meta = showContext
    ? `${totalMatches} ${totalMatches === 1 ? 'partido' : 'partidos'}`
    : `${round.length === 1 ? `${round[0]} · ` : ''}${totalMatches} ${totalMatches === 1 ? 'partido' : 'partidos'}`;
  const initiallyVisible = showContext ? 4 : matches.length;
  const remaining = Math.max(0, totalMatches - initiallyVisible);

  return <article className={styles.tournamentCard} data-category={category}>
    <header className={styles.tournamentHead}>
      <div><h3>{tournament}</h3><p>{meta}</p></div>
      {category ? <span>{category}</span> : null}
    </header>
    <div className={styles.tournamentMatches}>
      {matches.slice(0, initiallyVisible).map(match => <ArchiveMatchRow match={match} showContext={showContext} key={match.id} />)}
      {remaining && href ? <Link className={styles.revealMatchesLink} href={href}>Ver {remaining} más</Link> : remaining ? <details className={styles.revealMatches}>
        <summary>Ver {remaining} más</summary>
        <div>{matches.slice(initiallyVisible).map(match => <ArchiveMatchRow match={match} showContext={showContext} key={match.id} />)}</div>
      </details> : null}
    </div>
  </article>;
}

export function MatchArchivePage({ matches }: { matches: MatchRecord[] }) {
  const dates = new Map<string, { date: ReturnType<typeof matchDate>; matches: MatchRecord[] }>();
  for (const match of matches) {
    const date = matchDate(match);
    const group = dates.get(date.key);
    dates.set(date.key, { date, matches: [...(group?.matches || []), match] });
  }

  return <div className={styles.resultList}>
    {[...dates].map(([key, group]) => {
      const { date, matches: day } = group;
      const tournaments = new Map<string, MatchRecord[]>();
      for (const match of day) tournaments.set(match.tournament, [...(tournaments.get(match.tournament) || []), match]);
      return <details className={styles.dayGroup} open key={key}>
        <summary className={styles.groupHead}>
          <h2>{date.exact && date.dateTime ? <time dateTime={date.dateTime}><span className={styles.dateLong}>{date.long}</span><span className={styles.dateShort}>{date.short}</span></time> : <><span className={styles.dateLong}>{date.long}</span><span className={styles.dateShort}>{date.short}</span></>}</h2>
          <span className={styles.dayMeta}><span>{day.length} {day.length === 1 ? 'partido' : 'partidos'}</span><ChevronDown size={18} aria-hidden="true"/></span>
        </summary>
        <div className={styles.archiveBoard}>{[...tournaments].map(([tournament, tournamentMatches]) => <ArchiveTournamentCard tournament={tournament} matches={tournamentMatches} key={tournament} />)}</div>
      </details>;
    })}
  </div>;
}
