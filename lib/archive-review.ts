import type { Match } from './types';
import { normalizeText } from './quality';
/** Candidates only: repeated events and aliases can be legitimate. Never deletes. */
export function conflictCandidates(matches: Match[]) {
  const groups = new Map<string,Match[]>();
  for (const m of matches) {
    const key = [m.year,normalizeText(m.tournament),normalizeText(m.round),...[m.player1.name,m.player2.name].map(normalizeText).sort()].join('|');
    const rows = groups.get(key) || []; rows.push(m); groups.set(key,rows);
  }
  return [...groups].filter(([,rows]) => rows.length > 1).map(([key,rows]) => {
    const oriented = rows.map(m => [...m.score_summary.games].map(g => m.player1.name.localeCompare(m.player2.name) < 0 ? g.join('-') : [...g].reverse().join('-')).join(' '));
    const dates = rows.map(m => (m.context?.date || m.score_summary.timestamp).slice(0,10));
    const sameScore = new Set(oriented).size === 1, sameDate = new Set(dates).size === 1;
    return { key, rows, kind: !sameScore ? 'Marcadores diferentes' : !sameDate ? 'Mismo marcador, fechas diferentes' : 'Coincidencia de marcador y fecha', requiresReview:true as const };
  }).sort((a,b) => a.key.localeCompare(b.key));
}
