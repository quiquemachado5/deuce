import type { Match, Tour } from "./types";
import editionFormats from "./edition-format-evidence.json";
import {reviewedHistoricalEditionCoverage} from "./reviewed-historical-editions";
import { prepareMatch, eligibleMatch } from "./quality";
import { roundPosition } from "./editorial";
import { canonicalTournamentName } from "./tournament-identity";
export type EditionAudit = {
  tournament: string;
  tour?: Tour;
  year: number;
  category: string;
  sourceRows: number;
  /** A second tournament in the same venue/year remains a distinct occurrence. */
  occurrence?: string;
  competitionFormat?: 'interrupted-knockout' | 'multiple-occurrences' | 'team-singles';
  formatEvidence?: string;
  formatSources?: string[];
  sourceCategory?: string;
  finalStatus?: 'not-played';
  drawSize?: number;
  duplicateIds?: number;
  drawSizeSource?: string;
  expectedRounds?:Record<string,number>;
  completed: number;
  terminal: number;
  pending: number;
  hasFinal: boolean;
  rounds: Record<string, number>;
  expectedLateRounds: boolean;
  missingLateRounds: string[];
  completeDraw: boolean | null;
};
const knockoutCategories = new Set(["Grand Slam", "Masters 1000", "ATP 500", "ATP 250", "ATP International Series Gold", "Precursores de Masters", "WTA 1000", "WTA 500", "WTA 250", "WTA 125", "WTA · alto nivel histórico"]);
const lateRounds = [{position:5,label:"cuartos",singular:"cuarto",expected:4},{position:6,label:"semifinales",singular:"semifinal",expected:2},{position:7,label:"finales",singular:"final",expected:1}] as const;

type AuditIdentity = Pick<EditionAudit,'tournament'|'tour'|'year'|'occurrence'>;
export function editionFormatRule(audit: Partial<AuditIdentity>) {
  return editionFormats.rules.find(rule => rule.tournament === audit.tournament &&
    rule.years.includes(audit.year || 0) && (rule.tour === 'any' || rule.tour === (audit.tour || 'atp')));
}

/** Reviewed format facts change expectations, never manufacture a match or a certification. */
function reviewedFormat(audit: EditionAudit): EditionAudit {
  const rule = editionFormatRule(audit);
  if (!rule) return audit;
  return {...audit,
    ...(rule.category ? {category:rule.category,sourceCategory:audit.sourceCategory || audit.category} : {}),
    competitionFormat:rule.format as EditionAudit['competitionFormat'],
    formatEvidence:rule.id, formatSources:[...rule.sources],
    ...(rule.finalStatus === 'not-played' ? {finalStatus:'not-played' as const} : {}),
  };
}

export function editionCompleteness(audit: Pick<EditionAudit,"category"|"rounds"|"pending"|"drawSize"|"duplicateIds"|"drawSizeSource"|"expectedRounds"> & Partial<AuditIdentity>) {
  const rule=editionFormatRule(audit);
  // AO1977 old snapshots contain both occurrences. Fresh audits split them by source date.
  const reviewedLate=rule && !(rule.format==='multiple-occurrences' && audit.occurrence) ? rule.lateRounds as Record<string,number> : undefined;
  const expectedCount=(position:number,count:number)=>reviewedLate?.[String(position)] ?? count;
  const hasLateRound=lateRounds.some(({position})=>(audit.rounds[String(position)]||0)>0);
  const expected=(knockoutCategories.has(audit.category)||!!rule)&&hasLateRound;
  const missing=expected?lateRounds.flatMap(({position,label,singular,expected:count})=>{const actual=audit.rounds[String(position)]||0,difference=expectedCount(position,count)-actual;return difference>0?[`${difference} ${difference===1?singular:label}`]:[];}):[];
  const overfull=lateRounds.some(({position,expected:count})=>(audit.rounds[String(position)]||0)>expectedCount(position,count));
  let completeDraw:boolean|null=null;
  if(expected&&(missing.length||audit.pending||overfull||audit.duplicateIds))completeDraw=false;
  // A format exception is not a branch-by-branch reconciliation. It cannot certify a draw.
  else if(expected&&!rule&&audit.drawSizeSource&&audit.expectedRounds){
    completeDraw=Object.entries(audit.expectedRounds).every(([round,count])=>(audit.rounds[round]||0)===count)&&Object.keys(audit.rounds).every(round=>round in audit.expectedRounds!);
  }else if(expected&&!rule&&audit.drawSizeSource&&audit.drawSize&&[8,16,32,64,128].includes(audit.drawSize)){
    completeDraw=Array.from({length:Math.log2(audit.drawSize)},(_,i)=>i).every(i=>(audit.rounds[String(7-i)]||0)===2**i);
  }
  return {expectedLateRounds:expected,missingLateRounds:missing,completeDraw};
}
/** Use the recorded source date only for an explicitly reviewed multiple occurrence. */
function sourceOccurrence(match:Match,tournament:string) {
  const rule=editionFormatRule({tournament,year:match.year,tour:match.tour});
  const date=match.context?.date?.slice(0,10),month=date?.slice(0,7);
  if(rule?.format!=='multiple-occurrences'||!date)return undefined;
  return rule.occurrenceWindows?.find(window=>date>=window.from&&date<=window.through)?.id ||
    (month&&rule.occurrences?.includes(month)?month:undefined);
}
export function auditEditions(source: Match[]): EditionAudit[] {
  const groups = new Map<string, EditionAudit>();
  const ids = new Set<string>();
  for (const row of source) {
    const m = prepareMatch(row), tour = m.tour || 'atp',
      tournament = canonicalTournamentName(m.tournament, m.year, m.category, tour),
      occurrence=sourceOccurrence(m,tournament),
      key = [tournament, m.year, m.category, tour, occurrence || ""].join("|");
    const a = groups.get(key) || {
      tournament,
      tour,
      year: m.year,
      category: m.category,
      ...(occurrence ? {occurrence} : {}),
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
    else if (/retired|abandoned|walkover|cancelled|default/i.test(row.status))
      a.terminal++;
    else a.pending++;
    const r = roundPosition(row.round);
    if (r) {
      a.rounds[r] = (a.rounds[r] || 0) + 1;
      if (r === 7) a.hasFinal = true;
    }
    groups.set(key, a);
  }
  return [...groups.values()].map(a=>{
    // Both complete 128-player brackets independently reconciled, branch by branch.
    if(a.year===2018&&a.tour==='wta'&&['Australian Open','Roland Garros'].includes(a.tournament))Object.assign(a,{drawSize:128,drawSizeSource:`https://wtafiles.wtatennis.com/pdf/draws/2018/${a.tournament==='Australian Open'?'901':'903'}/MDS.pdf`});
    // 56 entrants, eight first-round byes. Verified against the published main draw.
    if(a.tournament==='Paris'&&a.year===2026&&a.tour==='atp')Object.assign(a,{drawSize:56,drawSizeSource:'https://app-rpm.cdn.prismic.io/app-rpm/m8v7BlcUsPwhkD2l_Tableausimplemessieurs-30octobre.pdf',expectedRounds:{'2':24,'3':16,'4':8,'5':4,'6':2,'7':1}});
    if(a.year===2025&&a.tour==='wta'&&a.tournament==='Australian Open')Object.assign(a,{drawSize:128,drawSizeSource:'https://wtafiles.wtatennis.com/pdf/draws/2025/901/MDS.pdf'});
    if(a.year===2025&&a.tour==='wta'&&a.tournament==='Adelaide')Object.assign(a,{drawSize:30,drawSizeSource:'https://wtafiles.wtatennis.com/pdf/draws/2025/2014/MDS.pdf',expectedRounds:{'3':14,'4':8,'5':4,'6':2,'7':1}});
    if(a.category==='ATP International Series Gold'){const rows=source.filter(m=>m.year===a.year&&(m.tour||'atp')===(a.tour||'atp')&&m.tournament===a.tournament);const proof=reviewedHistoricalEditionCoverage(rows);if(proof)Object.assign(a,proof);}
    const reviewed=reviewedFormat(a);
    return {...reviewed,...editionCompleteness(reviewed)};
  }).sort(
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
    const key = [tournament, row.year, row.category, tour, row.occurrence || ''].join('|');
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
  return [...groups.values()].map(row => { const reviewed=reviewedFormat(row); return {...reviewed,...editionCompleteness(reviewed)}; }).sort(
    (a, b) => b.year - a.year || b.pending - a.pending || a.tournament.localeCompare(b.tournament, 'es'),
  );
}
