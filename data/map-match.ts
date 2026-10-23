import type { Match } from '@/lib/types';
import type { MatchRecord } from '@/types/deuce';
import { displaySetClosed, tieBreakPoints } from '@/lib/score-display';
import { displayPlayerName, tournamentName } from '@/lib/labels';
import { browserRound } from '@/lib/match-browser';
import { playerBiography } from '@/lib/player-bio';
import { playerSlug } from '@/lib/explore';
import { roundPosition } from '@/lib/editorial';

/** Single boundary between the provider/archive model and the handoff UI. */
export function toMatchRecord(match: Match): MatchRecord {
  const ties = tieBreakPoints(match);
  const rawDate = match.context?.date?.slice(0,10) || '';
  const parsedDate = Date.parse(`${rawDate}T12:00:00Z`);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && Number.isFinite(parsedDate) && new Date(parsedDate).toISOString().startsWith(rawDate) ? rawDate : '';
  return {
    id: match.match_id, tournament: tournamentName(match.tournament), round: browserRound(match), date,
    dateLabel: match.context?.dateLabel, year: match.year, status: match.status,
    requiredSets: /(?:BO3|mejor de 3)/i.test(match.context?.format || '') ? 2 : /(?:BO5|mejor de 5)/i.test(match.context?.format || '') || match.category === 'Grand Slam' ? 3 : 2,
    players: [match.player1,match.player2].map(player => ({ id: playerSlug(player.name), name: displayPlayerName(player.name), countryCode: playerBiography(player.name)?.country || '' })) as MatchRecord['players'],
    sets: match.score_summary.games.flatMap((games,index) => games.length === 2 && games.every(n => Number.isFinite(n) && n >= 0) ? [{
      games: [games[0],games[1]], completed: displaySetClosed(match,index),
      tieBreak: ties[index] !== undefined ? (games[0] < games[1] ? [Number(ties[index]),null] : [null,Number(ties[index])]) : undefined,
    }] : []),
    href: `/match/${match.match_id}`, isFinal: roundPosition(match.round) === 7,
    winnerIndex: match.winner === 1 || match.winner === 2 ? match.winner - 1 as 0 | 1 : undefined,
    tags: [match.category, String(match.year), ...(roundPosition(match.round) === 7 ? ['Finales'] : [])],
  };
}

export { resolvedWinner, resolvedSetClosed } from '@/lib/deuce-score';
