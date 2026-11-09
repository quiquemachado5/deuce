import Link from 'next/link';
import IntentLink from '@/components/IntentLink';
import { ArrowRight, Check } from 'lucide-react';
import PlayerFlag from '@/components/PlayerFlag';
import type { MatchRecord } from '@/types/deuce';
import { resolvedSetClosed, resolvedWinner } from '@/lib/deuce-score';
import { matchDatePresentation } from '@/lib/match-date';
import styles from '@/app/buscar/search.module.css';

function matchDate(match: MatchRecord) {
  return matchDatePresentation({
    date: match.date,
    dateLabel: match.dateLabel,
    year: match.year,
    tournament: match.tournament,
  });
}

export function ArchiveMatchRow({ match, showContext = false, showTournamentContext = false, showAction = false, prefetch = false }: { match: MatchRecord; showContext?: boolean; showTournamentContext?: boolean; showAction?: boolean; prefetch?: boolean }) {
  const winner = resolvedWinner(match);
  const date = matchDate(match);
  return <IntentLink className={styles.archiveMatch} data-tour={match.tour} href={match.href} prefetch={prefetch}>
    {showTournamentContext ? <div className={`${styles.archiveMatchContext} ${styles.archiveMatchContextProfile}`}><strong>{match.tournament}</strong><span>{match.round} · {date.long}</span></div> : showContext ? <div className={styles.archiveMatchContext}>{match.round} · {date.long}</div> : null}
    {match.players.map((player, side) => <div className={styles.archivePlayerRow} data-winner={winner === side || undefined} key={player.id}>
      <span className={styles.archivePlayer}>
        <span className={styles.archiveFlag} aria-hidden="true"><PlayerFlag code={player.countryCode} /></span>
        <strong>{player.name}</strong>
        {winner === side ? <Check className={styles.archiveWinnerMark} size={15} strokeWidth={2.5} aria-label="Ganador" /> : null}
      </span>
      <span className={styles.archiveSets} aria-label={`Marcador de ${player.name}`}>
        {Array.from({ length: 5 }, (_, index) => {
          const offset = Math.max(0, 5 - match.sets.length);
          const set = index >= offset ? match.sets[index - offset] : undefined;
          const tieBreak = set?.tieBreak?.[side];
          const setWon = Boolean(set && resolvedSetClosed(set) && set.games[side] > set.games[1 - side]);
          return <span data-set-won={setWon || undefined} key={index}>{set ? set.games[side] : ''}{tieBreak != null ? <sup>{tieBreak}</sup> : null}</span>;
        })}
      </span>
    </div>)}
    {showAction ? <span className={styles.archiveMatchAction} aria-hidden="true"><ArrowRight size={16} strokeWidth={2.2} /></span> : null}
  </IntentLink>;
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
      return <section className={styles.dayGroup} key={key}>
        <header className={styles.groupHead}>
          <h2>{date.exact && date.dateTime ? <time dateTime={date.dateTime}><span className={styles.dateLong}>{date.long}</span><span className={styles.dateShort}>{date.short}</span></time> : <><span className={styles.dateLong}>{date.long}</span><span className={styles.dateShort}>{date.short}</span></>}</h2>
          <p>{day.length} {day.length === 1 ? 'partido' : 'partidos'}</p>
        </header>
        <div className={styles.archiveBoard}>{[...tournaments].map(([tournament, tournamentMatches]) => <ArchiveTournamentCard tournament={tournament} matches={tournamentMatches} key={tournament} />)}</div>
      </section>;
    })}
  </div>;
}
