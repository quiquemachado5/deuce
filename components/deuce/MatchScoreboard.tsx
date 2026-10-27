import { ArrowUpRight, Check } from 'lucide-react';
import Link from '@/components/IntentLink';
import type { MatchRecord } from '@/types/deuce';
import PlayerFlag from '@/components/PlayerFlag';
import { resolvedWinner, resolvedSetClosed } from '@/lib/deuce-score';

export function ScoreRows({ match, playerLinks = false }: { match: MatchRecord; playerLinks?: boolean }) {
  const winner = resolvedWinner(match);
  return <div className="global-scoreboard" role="group" aria-label={`${match.players[0].name} contra ${match.players[1].name}${winner >= 0 ? `. Ganó ${match.players[winner].name}` : ''}`}>
    {match.players.map((player, side) => <div className={`global-player${winner === side ? ' match-winner' : ''}`} key={player.id}>
      <span className="player-flag" aria-hidden="true">{player.countryCode && <PlayerFlag code={player.countryCode} />}</span>
      <strong className="global-player-name">
        {playerLinks ? <Link href={`/jugadores/${player.id}`}>{player.name}</Link> : player.name}
        {winner === side && <span className="match-win-mark" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>}
      </strong>
      <div className="global-sets">{match.sets.map((set,index) => {
        const won = resolvedSetClosed(set) && set.games[side] > set.games[1-side];
        const tie = set.tieBreak?.[side];
        return <span className={`global-set${won ? ' set-won' : ''}`} key={index} aria-label={`Set ${index+1}: ${set.games[side]}${tie != null ? `, tie-break ${tie}` : ''}`}>
          {set.games[side]}{tie != null && <sup aria-hidden="true">{tie}</sup>}
        </span>;
      })}</div>
    </div>)}
    {!match.sets.length && <p className="score-status">{/walkover/i.test(match.status || '') ? 'Sin disputa · W/O' : 'Sin sets registrados'}</p>}
    {match.status && /retired|abandoned|disqualified|cancelled/i.test(match.status) && <p className="score-status">{/disqualified/i.test(match.status) ? 'Descalificación' : /cancelled/i.test(match.status) ? 'Cancelado' : 'Retirada'}</p>}
  </div>;
}

export function MatchScoreboard({ match, variant = 'card' }: { match: MatchRecord; variant?: 'card' | 'compact' | 'overlay' }) {
  const isFinal = match.isFinal ?? match.round.toLocaleLowerCase('es') === 'final';
  const date = match.date ? new Intl.DateTimeFormat('es-ES', { day:'numeric',month:'short',year:'numeric',timeZone:'UTC' }).format(new Date(`${match.date}T12:00:00Z`)) : String(match.year || '');
  const classes = variant === 'compact' ? 'result-row result-float-v2 simple-result' : variant === 'overlay' ? 'feature-score simple-match-card global-scoreboard--overlay' : 'match-scorecard simple-match-card hover-card';
  const approximateDate = match.dateLabel === 'Inicio del torneo';
  const context = match.category;
  return <Link href={match.href} prefetch={false} className={`${classes}${isFinal ? ' is-final' : ''}`}>
    <div className={variant === 'compact' ? 'simple-result-head' : 'simple-match-head'}><div><strong>{match.tournament}</strong><span>{match.round}</span>{context && <small>{context}</small>}</div><time className="simple-match-date" dateTime={approximateDate ? undefined : match.date || undefined}>{approximateDate && date ? `Semana del ${date}` : date}</time></div>
    <ScoreRows match={match} />
    <div className="simple-match-foot"><span>Ver partido <ArrowUpRight size={17} aria-hidden="true"/></span></div>
  </Link>;
}
