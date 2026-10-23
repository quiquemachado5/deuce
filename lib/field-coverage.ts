import type { Match } from './types';
import { publishedMatchMinutes } from './duration';
import { statNumber } from './archive-insights';
import { statLabel } from './statistics';

type Availability = { id: string; label: string; matches: number; both: number; historical: number; recent: number; years: number[] };
export type FieldCoverage = { total: number; reliable: number; partial: number; none: number; context: Availability[]; measures: Availability[] };
const measures = [
  ['Aces', 'Aces'], ['Double Faults', 'Dobles faltas'], ['1st serve in', 'Primeros saques dentro'],
  ['1st serve points won', 'Puntos con primer saque'], ['2nd serve points won', 'Puntos con segundo saque'],
  ['Return points won', 'Puntos al resto'], ['Break points saved', 'Bolas de break salvadas'],
  ['Break points converted', 'Bolas de break convertidas'], ['Golpes ganadores', 'Golpes ganadores'],
  ['Errores no forzados', 'Errores no forzados'],
] as const;
const reports = new WeakMap<Match[], FieldCoverage>();
/** Counts stored fields, never identities or values reconstructed by analytics. */
export function fieldCoverage(matches: Match[]): FieldCoverage {
  const saved = reports.get(matches);
  if (saved) return saved;
  const make = (id: string, label: string): Availability => ({ id, label, matches: 0, both: 0, historical: 0, recent: 0, years: [] });
  const context = [make('minutes', 'Duración'), make('age', 'Edad'), make('ranking', 'Ranking de entonces')];
  const rows = measures.map(([id, label]) => make(id, label));
  const byName = new Map(rows.map(row => [row.id, row]));
  const add = (row: Availability, match: Match, both: boolean) => {
    row.matches++;
    if (both) row.both++;
    if (match.match_id.startsWith('archive-')) row.historical++;
    else row.recent++;
    if (!row.years.includes(match.year)) row.years.push(match.year);
  };
  let reliable = 0, partial = 0, none = 0;
  const positive = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n > 0;
  for (const match of matches) {
    if (publishedMatchMinutes(match) !== null) add(context[0], match, false);
    const c = match.context;
    if (positive(c?.age1) || positive(c?.age2)) add(context[1], match, positive(c?.age1) && positive(c?.age2));
    if (c?.rankLabel === 'Ranking al jugar' && (positive(c.rank1) || positive(c.rank2))) add(context[2], match, positive(c.rank1) && positive(c.rank2));
    if (match.quality?.tape === 'reliable' && match.point_tape.length) reliable++;
    else if (match.quality?.tape === 'partial') partial++;
    else none++;
    const present = new Map<string, Set<1 | 2>>();
    for (const stat of match.statistics) {
      if (stat.period.toLowerCase() !== 'match' || (stat.player !== 1 && stat.player !== 2)) continue;
      const value = statNumber(stat);
      if (value === null || !Number.isFinite(value) || value < 0) continue;
      if (!byName.has(stat.name)) {
        const row = make(stat.name, statLabel(stat.name));
        rows.push(row);
        byName.set(stat.name, row);
      }
      const sides = present.get(stat.name) || new Set<1 | 2>();
      sides.add(stat.player);
      present.set(stat.name, sides);
    }
    for (const [name, sides] of present) add(byName.get(name)!, match, sides.size === 2);
  }
  for (const row of [...context, ...rows]) row.years.sort((a, b) => a - b);
  const result = { total: matches.length, reliable, partial, none, context: context.filter(row => row.matches), measures: rows.filter(row => row.matches) };
  reports.set(matches, result);
  return result;
}
