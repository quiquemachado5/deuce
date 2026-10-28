import Link from 'next/link';
import { Check } from 'lucide-react';
import PlayerFlag from '@/components/PlayerFlag';
import type { MatchRecord } from '@/types/deuce';
import { resolvedWinner } from '@/lib/deuce-score';
import styles from '@/app/buscar/search.module.css';

function dateKey(match: MatchRecord) {
  return match.date || `${match.year || 0}-01-01`;
}

function formatDate(value: string) {
  const parsed = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return value;
  const formatted = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parsed);
  return formatted.charAt(0).toLocaleUpperCase('es') + formatted.slice(1);
}

function formatShortDate(value: string) {
  const parsed = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(parsed);
}

export function ArchiveMatchRow({ match, showContext = false }: { match: MatchRecord; showContext?: boolean }) {
  const winner = resolvedWinner(match);
  return <Link className={styles.archiveMatch} href={match.href} prefetch={false} aria-label={`Ver ${match.players[0].name} contra ${match.players[1].name}`}>
    {showContext ? <div className={styles.archiveMatchContext}>{match.round}{match.date ? ` · ${formatDate(match.date)}` : ''}</div> : null}
    {match.players.map((player, side) => <div className={styles.archivePlayerRow} data-winner={winner === side || undefined} key={player.id}>
      <span className={styles.archivePlayer}>
        <span className={styles.archiveFlag} aria-hidden="true">{player.countryCode ? <PlayerFlag code={player.countryCode} /> : null}</span>
        <strong>{player.name}</strong>
        {winner === side ? <Check className={styles.archiveWinnerMark} size={15} strokeWidth={2.5} aria-label="Ganador" /> : null}
      </span>
      <span className={styles.archiveSets} aria-label={`Marcador de ${player.name}`}>
        {Array.from({ length: 5 }, (_, index) => {
          const offset = Math.max(0, 5 - match.sets.length);
          const set = index >= offset ? match.sets[index - offset] : undefined;
          const tieBreak = set?.tieBreak?.[side];
          return <span key={index}>{set ? set.games[side] : ''}{tieBreak != null ? <sup>{tieBreak}</sup> : null}</span>;
        })}
      </span>
    </div>)}
  </Link>;
}

export function ArchiveTournamentCard({ tournament, matches, showContext = false }: { tournament: string; matches: MatchRecord[]; showContext?: boolean }) {
  const category = matches.find(match => match.category)?.category || '';
  const round = [...new Set(matches.map(match => match.round).filter(Boolean))];
  const meta = showContext
    ? `${matches.length} ${matches.length === 1 ? 'partido' : 'partidos'}`
    : `${round.length === 1 ? `${round[0]} · ` : ''}${matches.length} ${matches.length === 1 ? 'partido' : 'partidos'}`;
  const initiallyVisible = showContext ? 4 : matches.length;
  const remaining = Math.max(0, matches.length - initiallyVisible);

  return <article className={styles.tournamentCard} data-category={category}>
    <header className={styles.tournamentHead}>
      <div><h3>{tournament}</h3><p>{meta}</p></div>
      {category ? <span>{category}</span> : null}
    </header>
    <div className={styles.tournamentMatches}>
      {matches.slice(0, initiallyVisible).map(match => <ArchiveMatchRow match={match} showContext={showContext} key={match.id} />)}
      {remaining ? <details className={styles.revealMatches}>
        <summary>Ver {remaining} más</summary>
        <div>{matches.slice(initiallyVisible).map(match => <ArchiveMatchRow match={match} showContext={showContext} key={match.id} />)}</div>
      </details> : null}
    </div>
  </article>;
}

export function MatchArchivePage({ matches }: { matches: MatchRecord[] }) {
  const dates = new Map<string, MatchRecord[]>();
  for (const match of matches) {
    const key = dateKey(match);
    dates.set(key, [...(dates.get(key) || []), match]);
  }

  return <div className={styles.resultList}>
    {[...dates].map(([date, day]) => {
      const tournaments = new Map<string, MatchRecord[]>();
      for (const match of day) tournaments.set(match.tournament, [...(tournaments.get(match.tournament) || []), match]);
      return <section className={styles.dayGroup} key={date}>
        <header className={styles.groupHead}>
          <h2><span className={styles.dateLong}>{formatDate(date)}</span><span className={styles.dateShort}>{formatShortDate(date)}</span></h2>
          <p>{day.length} {day.length === 1 ? 'partido' : 'partidos'}</p>
        </header>
        <div className={styles.archiveBoard}>{[...tournaments].map(([tournament, tournamentMatches]) => <ArchiveTournamentCard tournament={tournament} matches={tournamentMatches} key={tournament} />)}</div>
      </section>;
    })}
  </div>;
}
