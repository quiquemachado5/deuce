import type { Match, Surface } from './types';
import { SURFACES } from './surface';

export type YearCoverage = { year: number; matches: number; ranking: number; statistics: number; points: number };
export function summarizeDataset(matches: Match[]) {
  const years = new Map<number, YearCoverage>();
  const surfaces = Object.fromEntries(SURFACES.map(surface => [surface, 0])) as Record<Surface, number>;
  for (const match of matches) {
    const row = years.get(match.year) || { year: match.year, matches: 0, ranking: 0, statistics: 0, points: 0 };
    row.matches++;
    // At least one contemporary rank; metrics still require the rival's rank.
    if (match.context?.rankLabel === 'Ranking al jugar' && (match.context.rank1 || match.context.rank2)) row.ranking++;
    if (match.statistics.length) row.statistics++;
    if (match.point_tape.length) row.points++;
    years.set(match.year, row);
    surfaces[match.surface]++;
  }
  return { tournaments: new Set(matches.map(match => match.tournament)).size, surfaces, years: [...years.values()].sort((a, b) => b.year - a.year) };
}

/** Publication gate for this full historical archive, not a generic dataset. */
export function assertPublishableArchive(matches: Match[], previousCount = 0, currentYear = new Date().getUTCFullYear()) {
  if (matches.some(match => match.data_source === 'mock')) throw new Error('Refusing to publish demo matches');
  if (matches.length < 100_000) throw new Error('Archive unexpectedly small: publication requires at least 100000 real matches');
  if (!matches.some(match => match.year === 1968) || !matches.some(match => match.year >= currentYear - 1)) throw new Error('Archive is missing its historical or recent seasons');
  if (previousCount >= 100_000 && matches.length < previousCount * 0.9) throw new Error('Archive lost more than 10% of matches; review before publication');
  if (new Set(matches.map(match => match.match_id)).size !== matches.length) throw new Error('Archive contains duplicate match IDs');
}
