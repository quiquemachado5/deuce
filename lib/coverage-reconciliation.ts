import { conflictCandidates } from './archive-review';
import type { EditionAudit } from './edition-audit';
import { tournamentName } from './labels';
import type { Match, Tour } from './types';

export type CoverageIssueKind = 'draw' | 'verification' | 'conflict' | 'ranking' | 'history';
export type CoverageIssueState = 'confirmed' | 'review' | 'queued';

export type CoverageIssue = {
  id: string;
  tour: Tour;
  kind: CoverageIssueKind;
  state: CoverageIssueState;
  title: string;
  detail: string;
  count: number;
  year?: number;
  tournament?: string;
  category?: string;
  sourceRows?: number;
  pending?: number;
};

export type CoverageReconciliation = {
  summary: {
    editions: number;
    confirmed: number;
    verification: number;
    conflicts: number;
    rankingGroups: number;
    queuedCohorts: number;
    pendingRows: number;
  };
  issues: CoverageIssue[];
};

const tourOf = (value: Match | EditionAudit): Tour => value.tour === 'wta' ? 'wta' : 'atp';

function drawIssue(row: EditionAudit, state: CoverageIssueState): CoverageIssue {
  const missing = row.missingLateRounds.length
    ? `Rondas finales por contrastar: ${row.missingLateRounds.join(', ')}.`
    : row.duplicateIds
      ? `${row.duplicateIds} identificadores repetidos requieren contraste.`
      : row.pending
        ? `${row.pending} ${row.pending === 1 ? 'resultado no tiene' : 'resultados no tienen'} un estado terminal verificable.`
        : 'El tamaño completo del cuadro no está certificado por la fuente.';
  return {
    id: `${state}:${tourOf(row)}:${row.tournament}:${row.year}:${row.category}`,
    tour: tourOf(row),
    kind: state === 'confirmed' ? 'draw' : 'verification',
    state,
    title: `${tournamentName(row.tournament)} · ${row.year}`,
    detail: missing,
    count: Math.max(1, row.missingLateRounds.reduce((sum, item) => sum + (Number(item.match(/^\d+/)?.[0]) || 1), 0) + (row.duplicateIds || 0) + row.pending),
    year: row.year,
    tournament: row.tournament,
    category: row.category,
    sourceRows: row.sourceRows,
    pending: row.pending,
  };
}

/**
 * Produces one non-destructive ledger for the public Coverage page. A row is
 * "confirmed" only when the stored evidence proves an inconsistency. Unknown
 * draw sizes remain a separate verification state and are never counted as
 * missing matches.
 */
export function reconcileCoverage(
  matches: readonly Match[],
  audits: readonly EditionAudit[],
  pendingWtaCohorts: readonly string[] = [],
): CoverageReconciliation {
  const confirmed = audits.filter(row => row.completeDraw === false).map(row => drawIssue(row, 'confirmed'));
  const verification = audits.filter(row => row.completeDraw === null).map(row => drawIssue(row, 'review'));
  const conflicts: CoverageIssue[] = conflictCandidates(matches as Match[]).map(group => {
    const first = group.rows[0];
    return {
      id: `conflict:${group.key}`,
      tour: tourOf(first),
      kind: 'conflict',
      state: 'review',
      title: `${first.player1.name} / ${first.player2.name}`,
      detail: `${tournamentName(first.tournament)} · ${first.year} · ${first.round}. ${group.kind}.`,
      count: group.rows.length,
      year: first.year,
      tournament: first.tournament,
      category: first.category,
      sourceRows: group.rows.length,
    };
  });
  const rankingGroups = new Map<string, CoverageIssue>();
  for (const match of matches) {
    if (match.year < 2023 || match.context?.rankLabel === 'Ranking al jugar') continue;
    const tour = tourOf(match);
    const key = `${tour}:${match.tournament}:${match.year}`;
    const saved = rankingGroups.get(key);
    if (saved) saved.count++;
    else rankingGroups.set(key, {
      id: `ranking:${key}`,
      tour,
      kind: 'ranking',
      state: 'review',
      title: `${tournamentName(match.tournament)} · ${match.year}`,
      detail: 'Ranking histórico exacto pendiente de atribuir; no se sustituye por el ranking actual.',
      count: 1,
      year: match.year,
      tournament: match.tournament,
      category: match.category,
    });
  }
  const history: CoverageIssue[] = pendingWtaCohorts.map(cohort => {
    const [year, level = 'sin nivel'] = cohort.split('-');
    return {
      id: `history:wta:${cohort}`,
      tour: 'wta',
      kind: 'history',
      state: 'queued',
      title: `Cohorte WTA ${year} · ${level}`,
      detail: 'Pendiente de una respuesta completa y verificable del proveedor; no forma parte de la publicación.',
      count: 1,
      year: Number(year) || undefined,
      category: level,
    };
  });
  const issues = [...confirmed, ...conflicts, ...rankingGroups.values(), ...history, ...verification]
    .sort((a, b) => {
      const priority = { confirmed: 0, queued: 1, review: 2 } as const;
      return priority[a.state] - priority[b.state] || (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title, 'es');
    });
  return {
    summary: {
      editions: audits.length,
      confirmed: confirmed.length,
      verification: verification.length,
      conflicts: conflicts.length,
      rankingGroups: rankingGroups.size,
      queuedCohorts: history.length,
      pendingRows: audits.reduce((sum, row) => sum + row.pending, 0),
    },
    issues,
  };
}
