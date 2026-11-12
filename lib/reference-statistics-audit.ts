import { roundPosition, winnerName } from './editorial';
import { eligibleMatch } from './quality';
import type { Match, Tour } from './types';

const slams = ['Australian Open', 'Roland Garros', 'Wimbledon', 'US Open'];
type Edition = { year: number; tournament: string };
/** Calendar sequence, not a run over only the editions a player attended. Modern singles calendar only. */
export function observedSlamStageSequence(matches: readonly Match[], tour: Tour, name: string, start: Edition, end: Edition, stage: 5 | 6 | 7) {
  if (start.year < 1988 || end.year < start.year || !slams.includes(start.tournament) || !slams.includes(end.tournament)) throw new Error('Unsupported Grand Slam calendar interval');
  const calendar: Edition[] = [];
  for (let year = start.year; year <= end.year; year++) {
    // Wimbledon was cancelled and Roland Garros followed the US Open in 2020.
    for (const tournament of year === 2020 ? ['Australian Open', 'US Open', 'Roland Garros'] : slams) calendar.push({ year, tournament });
  }
  const first = calendar.findIndex(e => e.year === start.year && e.tournament === start.tournament);
  const last = calendar.findIndex(e => e.year === end.year && e.tournament === end.tournament);
  if (first < 0 || last < first) throw new Error('Invalid or cancelled Grand Slam edition');
  const editions = calendar.slice(first, last + 1);
  const proof = new Map<string, Match>();
  for (const match of matches) {
    if ((match.tour || 'atp') !== tour || match.category !== 'Grand Slam' || match.context?.qualifying || !eligibleMatch(match)) continue;
    if (![match.player1.name, match.player2.name].includes(name) || roundPosition(match.round) < stage) continue;
    const key = match.year + ':' + match.tournament;
    if (!proof.has(key)) proof.set(key, match);
  }
  const missing = editions.filter(edition => !proof.has(edition.year + ':' + edition.tournament));
  return { expectedEditions: editions.length, observed: editions.length - missing.length, matched: missing.length === 0, missing,
    evidence: editions.flatMap(edition => { const match = proof.get(edition.year + ':' + edition.tournament); return match ? [match.match_id] : []; }) };
}

/** A reference fact never changes the archive: this check reports agreement without manufacturing results. */
export function observedTournamentTitles(matches: readonly Match[], tour: Tour, name: string, tournament: string, firstYear: number, lastYear: number) {
  const titles = new Map<number, string>();
  for (const match of matches) if ((match.tour || 'atp') === tour && match.tournament === tournament && match.year >= firstYear && match.year <= lastYear && !match.context?.qualifying && roundPosition(match.round) === 7 && eligibleMatch(match) && winnerName(match) === name) titles.set(match.year, match.match_id);
  return { value: titles.size, evidence: [...titles.values()] };
}
