import type { Match, Tour } from "./types";
import { prepareMatch, eligibleMatch } from "./quality";
import { roundPosition } from "./editorial";
export type EditionAudit = {
  tournament: string;
  tour?: Tour;
  year: number;
  category: string;
  sourceRows: number;
  completed: number;
  terminal: number;
  pending: number;
  hasFinal: boolean;
  rounds: Record<string, number>;
  expectedLateRounds: boolean;
  missingLateRounds: string[];
  completeDraw: boolean | null;
};
const knockoutCategories = new Set(["Grand Slam", "Masters 1000", "ATP 500", "ATP 250", "Precursores de Masters", "WTA 1000", "WTA 500", "WTA 250", "WTA 125", "WTA · alto nivel histórico"]);
const lateRounds = [{position:5,label:"cuartos",singular:"cuarto",expected:4},{position:6,label:"semifinales",singular:"semifinal",expected:2},{position:7,label:"finales",singular:"final",expected:1}] as const;

export function editionCompleteness(audit: Pick<EditionAudit,"category"|"rounds"|"pending">) {
  const hasLateRound=lateRounds.some(({position})=>(audit.rounds[String(position)]||0)>0);
  const expected=knockoutCategories.has(audit.category)&&hasLateRound;
  const missing=expected?lateRounds.flatMap(({position,label,singular,expected:count})=>{const actual=audit.rounds[String(position)]||0,difference=count-actual;return difference>0?[`${difference} ${difference===1?singular:label}`]:[];}):[];
  return {expectedLateRounds:expected,missingLateRounds:missing,completeDraw:expected?missing.length===0&&audit.pending===0:null};
}
export function auditEditions(source: Match[]): EditionAudit[] {
  const groups = new Map<string, EditionAudit>();
  for (const row of source) {
    const m = prepareMatch(row),
      key = [m.tournament, m.year, m.category, m.tour || 'atp'].join("|");
    const a = groups.get(key) || {
      tournament: m.tournament,
      tour: m.tour || 'atp',
      year: m.year,
      category: m.category,
      sourceRows: 0,
      completed: 0,
      terminal: 0,
      pending: 0,
      hasFinal: false,
      rounds: {},
      expectedLateRounds: false,
      missingLateRounds: [],
      completeDraw: null,
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
  return [...groups.values()].map(a=>({...a,...editionCompleteness(a)})).sort(
    (a, b) =>
      b.year - a.year ||
      b.pending - a.pending ||
      a.tournament.localeCompare(b.tournament, "es"),
  );
}
