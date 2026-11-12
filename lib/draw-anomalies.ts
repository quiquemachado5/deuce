import type { EditionAudit } from './edition-audit';
import { normalizeText, resultIssue } from './quality';
import { publishedMatchDuplicateKey } from './publication-scope';
import type { Match } from './types';

export type DrawAnomaly = {
  severity: 'blocking' | 'review';
  code: 'duplicate-id' | 'duplicate-identity' | 'same-player' | 'impossible-score' | 'missing-rounds' | 'overfull-round' | 'pending-result';
  identity: string;
  detail: string;
};
export type DrawAnomalyReport = { schema: 1; checkedMatches: number; blocking: number; review: number; issues: DrawAnomaly[] };

const lateRoundCapacity: Record<string,number> = { '5':4, '6':2, '7':1 };
const editionIdentity = (row: EditionAudit) => `${row.tour || 'atp'}:${row.tournament}:${row.year}:${row.category}`;

/** Deterministic pre-publication checks. No score or missing draw slot is inferred. */
export function detectDrawAnomalies(matches: readonly Match[], audits: readonly EditionAudit[] = []): DrawAnomalyReport {
  const issues: DrawAnomaly[] = [], ids = new Set<string>(), semantic = new Map<string,string>();
  for (const match of matches) {
    const identity = `${match.tour || 'atp'}:${match.match_id}`;
    if (ids.has(identity)) issues.push({ severity:'blocking', code:'duplicate-id', identity, detail:'Identificador de partido repetido.' });
    ids.add(identity);
    if (normalizeText(match.player1.name).trim() === normalizeText(match.player2.name).trim()) {
      issues.push({ severity:'blocking', code:'same-player', identity, detail:'El mismo jugador ocupa ambos lados del partido.' });
    }
    const scoreIssue = resultIssue(match);
    if (scoreIssue) issues.push({ severity:'blocking', code:'impossible-score', identity, detail:scoreIssue });
    const key = publishedMatchDuplicateKey(match);
    if (key) {
      const previous = semantic.get(key);
      if (previous && previous !== identity) issues.push({ severity:'review', code:'duplicate-identity', identity, detail:`Coincide con ${previous}.` });
      else semantic.set(key, identity);
    }
  }
  for (const audit of audits) {
    const identity = editionIdentity(audit);
    if (audit.missingLateRounds.length) issues.push({ severity:'review', code:'missing-rounds', identity, detail:audit.missingLateRounds.join(', ') });
    if (audit.pending > 0) issues.push({ severity:'review', code:'pending-result', identity, detail:`${audit.pending} resultados pendientes.` });
    const overfull = Object.entries(lateRoundCapacity).filter(([round,capacity]) => (audit.rounds[round] || 0) > capacity);
    if (overfull.length) issues.push({ severity:'review', code:'overfull-round', identity, detail:overfull.map(([round,capacity])=>`ronda ${round}: ${audit.rounds[round]} de ${capacity}`).join(', ') });
  }
  issues.sort((a,b)=>a.severity.localeCompare(b.severity)||a.code.localeCompare(b.code)||a.identity.localeCompare(b.identity));
  return { schema:1, checkedMatches:matches.length, blocking:issues.filter(issue=>issue.severity==='blocking').length, review:issues.filter(issue=>issue.severity==='review').length, issues };
}

export function assertNoBlockingDrawAnomalies(matches: readonly Match[], audits: readonly EditionAudit[] = []) {
  const report = detectDrawAnomalies(matches,audits);
  if (report.blocking) throw new Error(`Publication blocked by ${report.blocking} draw anomalies: ${report.issues.filter(issue=>issue.severity==='blocking').slice(0,5).map(issue=>`${issue.code}:${issue.identity}`).join(', ')}`);
  return report;
}
