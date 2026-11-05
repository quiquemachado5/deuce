import type { Match, Tour } from "./types";
import { prepareMatch, eligibleMatch } from "./quality";
import { roundPosition } from "./editorial";
import { canonicalTournamentName } from "./tournament-identity";
export type EditionAudit = {
  tournament: string;
  tour?: Tour;
  year: number;
  category: string;
  sourceRows: number;
  drawSize?: number;
  duplicateIds?: number;
  drawSizeSource?: string;
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

export function editionCompleteness(audit: Pick<EditionAudit,"category"|"rounds"|"pending"|"drawSize"|"duplicateIds"|"drawSizeSource">) {
  const hasLateRound=lateRounds.some(({position})=>(audit.rounds[String(position)]||0)>0);
  const expected=knockoutCategories.has(audit.category)&&hasLateRound;
  const missing=expected?lateRounds.flatMap(({position,label,singular,expected:count})=>{const actual=audit.rounds[String(position)]||0,difference=count-actual;return difference>0?[`${difference} ${difference===1?singular:label}`]:[];}):[];
  const overfull=lateRounds.some(({position,expected:count})=>(audit.rounds[String(position)]||0)>count);
  let completeDraw:boolean|null=null;
  if(expected&&(missing.length||audit.pending||overfull||audit.duplicateIds))completeDraw=false;
  else if(expected&&audit.drawSizeSource&&audit.drawSize&&[8,16,32,64,128].includes(audit.drawSize)){
    completeDraw=Array.from({length:Math.log2(audit.drawSize)},(_,i)=>i).every(i=>(audit.rounds[String(7-i)]||0)===2**i);
  }
  return {expectedLateRounds:expected,missingLateRounds:missing,completeDraw};
}
export function auditEditions(source: Match[]): EditionAudit[] {
  const groups = new Map<string, EditionAudit>();
  const ids = new Set<string>();
  for (const row of source) {
    const m = prepareMatch(row), tour = m.tour || 'atp',
      tournament = canonicalTournamentName(m.tournament, m.year, m.category, tour),
      key = [tournament, m.year, m.category, tour].join("|");
    const a = groups.get(key) || {
      tournament,
      tour,
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
    const identity=`${m.tour||'atp'}:${m.match_id}`;
    if(ids.has(identity)){a.duplicateIds=(a.duplicateIds||0)+1;groups.set(key,a);continue;}
    ids.add(identity);
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

/**
 * Old immutable snapshots can predate a reviewed venue alias. Merge only
 * editions that the current circuit-aware identity rules prove equivalent,
 * then recompute completeness instead of hiding either source row.
 */
export function normalizeEditionAudits(source: readonly EditionAudit[]): EditionAudit[] {
  const groups = new Map<string, EditionAudit>();
  for (const row of source) {
    const tour = row.tour === 'wta' ? 'wta' : 'atp';
    const tournament = canonicalTournamentName(row.tournament, row.year, row.category, tour);
    const key = [tournament, row.year, row.category, tour].join('|');
    const saved = groups.get(key);
    if (!saved) {
      groups.set(key, { ...row, tournament, tour, rounds: { ...row.rounds } });
      continue;
    }
    saved.sourceRows += row.sourceRows;
    saved.completed += row.completed;
    saved.terminal += row.terminal;
    saved.pending += row.pending;
    saved.duplicateIds = (saved.duplicateIds || 0) + (row.duplicateIds || 0) || undefined;
    saved.hasFinal ||= row.hasFinal;
    for (const [round, count] of Object.entries(row.rounds)) saved.rounds[round] = (saved.rounds[round] || 0) + count;
    if (saved.drawSize !== row.drawSize || saved.drawSizeSource !== row.drawSizeSource) {
      saved.drawSize = Math.max(saved.drawSize || 0, row.drawSize || 0) || undefined;
      saved.drawSizeSource = undefined;
    }
  }
  return [...groups.values()].map(row => ({ ...row, ...editionCompleteness(row) })).sort(
    (a, b) => b.year - a.year || b.pending - a.pending || a.tournament.localeCompare(b.tournament, 'es'),
  );
}
