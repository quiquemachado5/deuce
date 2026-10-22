import type { Match } from "./types";
import { prepareMatch, eligibleMatch } from "./quality";
import { roundPosition } from "./editorial";
export type EditionAudit = {
  tournament: string;
  year: number;
  category: string;
  sourceRows: number;
  completed: number;
  terminal: number;
  pending: number;
  hasFinal: boolean;
  rounds: Record<string, number>;
};
export function auditEditions(source: Match[]): EditionAudit[] {
  const groups = new Map<string, EditionAudit>();
  for (const row of source) {
    const m = prepareMatch(row),
      key = [m.tournament, m.year, m.category].join("|");
    const a = groups.get(key) || {
      tournament: m.tournament,
      year: m.year,
      category: m.category,
      sourceRows: 0,
      completed: 0,
      terminal: 0,
      pending: 0,
      hasFinal: false,
      rounds: {},
    };
    a.sourceRows++;
    if (eligibleMatch(m)) a.completed++;
    else if (/retired|abandoned|walkover|cancelled/i.test(row.status))
      a.terminal++;
    else a.pending++;
    const r = roundPosition(row.round);
    if (r) {
      a.rounds[r] = (a.rounds[r] || 0) + 1;
      if (r === 7) a.hasFinal = true;
    }
    groups.set(key, a);
  }
  return [...groups.values()].sort(
    (a, b) =>
      b.year - a.year ||
      b.pending - a.pending ||
      a.tournament.localeCompare(b.tournament, "es"),
  );
}
