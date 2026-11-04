import type { CoverageIssue, CoverageReconciliation } from './coverage-reconciliation';
import type { Tour } from './types';

export type RepairPriority = 'P0' | 'P1' | 'P2';
export type RepairState = 'pending' | 'investigating' | 'resolved' | 'dismissed';
export type RepairEvidence = {
  url: string;
  publisher: string;
  sourceType: 'official' | 'independent';
  scope: 'draw' | 'result' | 'status';
  checkedAt: string;
  note?: string;
};
export type RepairLedgerEntry = {
  id: string;
  tour: Tour;
  state: Exclude<RepairState, 'pending'>;
  updatedAt: string;
  evidence?: RepairEvidence[];
  note?: string;
};
export type RepairLedger = { schema: 1; entries: RepairLedgerEntry[] };
export type RepairQueueEntry = Pick<CoverageIssue, 'id' | 'tour' | 'reason' | 'title' | 'detail' | 'count' | 'year' | 'tournament' | 'category'> & {
  priority: RepairPriority;
  score: number;
  state: RepairState;
  evidence: RepairEvidence[];
  evidenceRequired: true;
  updatedAt?: string;
  note?: string;
};
export type IntegrityRepairQueue = {
  schema: 1;
  generatedAt: string;
  summary: {
    active: number;
    atp: number;
    wta: number;
    p0: number;
    p1: number;
    p2: number;
    investigating: number;
    resolvedAwaitingPublication: number;
    closed: number;
  };
  entries: RepairQueueEntry[];
};

const repairableReasons = new Set<CoverageIssue['reason']>([
  'missing-late-rounds',
  'duplicate-identifiers',
  'unresolved-results',
  'conflicting-results',
]);

function evidenceValid(evidence: RepairEvidence) {
  let url: URL;
  try { url = new URL(evidence.url); } catch { return false; }
  const checkedAt = new Date(`${evidence.checkedAt}T00:00:00.000Z`);
  return url.protocol === 'https:'
    && evidence.publisher.trim().length > 1
    && ['official', 'independent'].includes(evidence.sourceType)
    && ['draw', 'result', 'status'].includes(evidence.scope)
    && /^\d{4}-\d{2}-\d{2}$/.test(evidence.checkedAt)
    && !Number.isNaN(checkedAt.valueOf())
    && checkedAt.toISOString().slice(0, 10) === evidence.checkedAt;
}

export function assertRepairLedger(value: unknown): asserts value is RepairLedger {
  if (!value || typeof value !== 'object') throw new Error('Integrity repair ledger is missing');
  const ledger = value as Partial<RepairLedger>;
  if (ledger.schema !== 1 || !Array.isArray(ledger.entries)) throw new Error('Integrity repair ledger schema is invalid');
  const ids = new Set<string>();
  for (const entry of ledger.entries) {
    if (!entry?.id || (entry.tour !== 'atp' && entry.tour !== 'wta')) throw new Error('Integrity repair ledger contains an invalid identity');
    if (ids.has(entry.id)) throw new Error(`Integrity repair ledger repeats ${entry.id}`);
    ids.add(entry.id);
    if (!['investigating', 'resolved', 'dismissed'].includes(entry.state)) throw new Error(`${entry.id}: invalid repair state`);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(entry.updatedAt)) throw new Error(`${entry.id}: invalid update timestamp`);
    const evidence = entry.evidence || [];
    if (!evidence.every(evidenceValid)) throw new Error(`${entry.id}: invalid or insecure evidence source`);
    if ((entry.state === 'resolved' || entry.state === 'dismissed') && evidence.length === 0) {
      throw new Error(`${entry.id}: ${entry.state} requires a documented source`);
    }
  }
}

function priority(issue: CoverageIssue): { priority: RepairPriority; score: number } {
  const reason = {
    'missing-late-rounds': 220,
    'conflicting-results': 200,
    'duplicate-identifiers': 150,
    'unresolved-results': 110,
    'uncertified-draw-size': 0,
    'missing-ranking-history': 0,
    'pending-provider-cohort': 0,
  }[issue.reason];
  const category = issue.category === 'Grand Slam' ? 80
    : /(?:Masters 1000|WTA 1000)/.test(issue.category || '') ? 60
      : /(?:ATP 500|WTA 500)/.test(issue.category || '') ? 35 : 15;
  const recency = (issue.year || 0) >= 2020 ? 15 : (issue.year || 0) >= 2000 ? 8 : 0;
  const score = reason + category + recency + Math.min(20, issue.count);
  return { priority: score >= 250 ? 'P0' : score >= 180 ? 'P1' : 'P2', score };
}

/**
 * Turns the public, non-destructive reconciliation ledger into an operational
 * queue. It never creates or edits a match. Closing an item requires an HTTPS
 * source in the separately reviewed ledger.
 */
export function buildIntegrityRepairQueue(
  report: CoverageReconciliation,
  ledger: RepairLedger,
  generatedAt = new Date().toISOString(),
): IntegrityRepairQueue {
  assertRepairLedger(ledger);
  const decisions = new Map(ledger.entries.map(entry => [entry.id, entry]));
  const candidates = report.issues.filter(issue => repairableReasons.has(issue.reason));
  const entries: RepairQueueEntry[] = candidates.map(issue => {
    const decision = decisions.get(issue.id);
    if (decision && decision.tour !== issue.tour) throw new Error(`${issue.id}: repair decision crosses ATP/WTA circuits`);
    const ranked = priority(issue);
    const state: RepairState = decision?.state ?? 'pending';
    return {
      id: issue.id,
      tour: issue.tour,
      reason: issue.reason,
      title: issue.title,
      detail: issue.detail,
      count: issue.count,
      year: issue.year,
      tournament: issue.tournament,
      category: issue.category,
      ...ranked,
      state,
      evidence: decision?.evidence || [],
      evidenceRequired: true as const,
      updatedAt: decision?.updatedAt,
      note: decision?.note,
    };
  }).sort((a, b) => a.priority.localeCompare(b.priority)
    || b.score - a.score
    || (b.year || 0) - (a.year || 0)
    || a.tour.localeCompare(b.tour)
    || a.title.localeCompare(b.title, 'es'));
  const active = entries.filter(entry => entry.state !== 'dismissed');
  const activeIds = new Set(entries.map(entry => entry.id));
  const closed = ledger.entries.filter(entry => !activeIds.has(entry.id) && (entry.state === 'resolved' || entry.state === 'dismissed')).length;
  const unresolvedOrphans = ledger.entries.filter(entry => !activeIds.has(entry.id) && entry.state === 'investigating');
  if (unresolvedOrphans.length) throw new Error(`Repair ledger has investigations absent from the current audit: ${unresolvedOrphans.map(entry => entry.id).join(', ')}`);
  return {
    schema: 1,
    generatedAt,
    summary: {
      active: active.length,
      atp: active.filter(entry => entry.tour === 'atp').length,
      wta: active.filter(entry => entry.tour === 'wta').length,
      p0: active.filter(entry => entry.priority === 'P0').length,
      p1: active.filter(entry => entry.priority === 'P1').length,
      p2: active.filter(entry => entry.priority === 'P2').length,
      investigating: active.filter(entry => entry.state === 'investigating').length,
      resolvedAwaitingPublication: active.filter(entry => entry.state === 'resolved').length,
      closed,
    },
    entries,
  };
}
