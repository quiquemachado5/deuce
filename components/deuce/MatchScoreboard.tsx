import { ArrowUpRight, Check } from 'lucide-react';
import Link from '@/components/IntentLink';
import type { MatchRecord } from '@/types/deuce';
import PlayerFlag from '@/components/PlayerFlag';
import { resolvedWinner, resolvedSetClosed } from '@/lib/deuce-score';

function roundTone(round: string) {
  const normalized = round.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  if (normalized.includes('semi')) return 'semifinal';
  if (normalized.includes('cuartos') || normalized.includes('quarter')) return 'quarterfinal';
  if (normalized.includes('octavos') || normalized.includes('round of 16') || normalized === 'r16') return 'round-of-16';
  if (normalized === 'final') return 'final';
  return 'neutral';
}

function cleanLabel(value?: string) {
  return (value || '').replace(/^[\s·•/|–—.,:;-]+|[\s·•/|–—.,:;-]+$/g, '').trim();
}

export function ScoreRows({ match, playerLinks = false }: { match: MatchRecord; playerLinks?: boolean }) {
  const winner = resolvedWinner(match);
  return <div className="global-scoreboard" role="group" aria-label={`${match.players[0].name} contra ${match.players[1].name}${winner >= 0 ? `. Ganó ${match.players[winner].name}` : ''}`}>
    {match.players.map((player, side) => <div className={`global-player${winner === side ? ' match-winner' : ''}`} key={player.id}>
      <span className="player-flag" aria-hidden="true">{player.countryCode && <PlayerFlag code={player.countryCode} />}</span>
      <strong className="global-player-name">
        {playerLinks ? <Link href={`/jugadores/${player.id}${match.tour==='wta'?'?tour=wta':''}`}>{player.name}</Link> : player.name}
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

export function MatchScoreboard({ match, variant = 'card' }: { match: MatchRecord; variant?: 'card' | 'compact' | 'overlay' | 'detail' }) {
  const tournament = cleanLabel(match.tournament);
  const round = cleanLabel(match.round);
  const context = cleanLabel(match.category);
  const isFinal = match.isFinal ?? round.toLocaleLowerCase('es') === 'final';
  const date = match.date ? new Intl.DateTimeFormat('es-ES', { day:'numeric',month:'short',year:'numeric',timeZone:'UTC' }).format(new Date(`${match.date}T12:00:00Z`)) : String(match.year || '');
  const classes = variant === 'compact' ? 'result-row result-float-v2 simple-result' : variant === 'overlay' ? 'feature-score simple-match-card global-scoreboard--overlay' : variant === 'detail' ? 'match-scorecard simple-match-card match-scoreboard-detail' : 'match-scorecard simple-match-card hover-card';
  const approximateDate = match.dateLabel === 'Inicio del torneo';
  const content = <>
    <div className={variant === 'compact' ? 'simple-result-head' : 'simple-match-head'}>
      <div className="simple-match-event"><strong>{tournament}</strong>{round && <><span className="simple-match-slash" aria-hidden="true">/</span><span className={`match-round match-round--${roundTone(round)}`}>{round}</span></>}</div>
      {context && <small className="simple-match-category">{context}</small>}
    </div>
    <ScoreRows match={match} playerLinks={variant === 'detail'} />
    <div className="simple-match-foot"><time className="simple-match-date" dateTime={approximateDate ? undefined : match.date || undefined}>{approximateDate && date ? `Semana del ${date}` : date}</time>{variant !== 'detail' && <span>Ver partido <ArrowUpRight size={14} aria-hidden="true"/></span>}</div>
  </>;
  const className = `${classes}${isFinal ? ' is-final' : ''}`;
  const data = { 'data-event-surface': match.surface, 'data-event-category': context };
  return variant === 'detail'
    ? <section className={className} {...data}>{content}</section>
    : <Link href={match.href} prefetch={false} className={className} {...data}>{content}</Link>;
}
