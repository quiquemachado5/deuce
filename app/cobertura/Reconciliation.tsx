import Link from 'next/link';
import { Pagination } from '@/components/nocturno/Row';
import type { CoverageIssue, CoverageIssueState, CoverageReconciliation } from '@/lib/coverage-reconciliation';
import { number } from '@/lib/cuaderno/model';
import { reviewedFinals } from '@/lib/reviewed-finals';
import styles from './reconciliation.module.css';

type Query = { circuito?: string; estado?: string; page?: string };
const stateLabels: Record<CoverageIssueState | 'all', string> = { all: 'Todo el control', confirmed: 'Incidencias', review: 'Por verificar', queued: 'En cola' };
const kindLabels: Record<CoverageIssue['kind'], string> = { draw: 'Cuadro', verification: 'Alcance', conflict: 'Coincidencia', ranking: 'Ranking', history: 'Histórico' };

export default function Reconciliation({ report, query }: { report: CoverageReconciliation; query: Query }) {
  const tour = query.circuito === 'wta' ? 'wta' : query.circuito === 'atp' ? 'atp' : 'all';
  const state: CoverageIssueState | 'all' = ['confirmed', 'review', 'queued'].includes(query.estado || '') ? query.estado as CoverageIssueState : 'all';
  const filtered = report.issues.filter(issue => (tour === 'all' || issue.tour === tour) && (state === 'all' || issue.state === state));
  const page = Math.max(1, Math.min(Math.ceil(filtered.length / 25) || 1, Number(query.page) || 1));
  const visible = filtered.slice((page - 1) * 25, page * 25);
  const href = (next: Partial<Query>) => {
    const params = new URLSearchParams();
    const circuit = next.circuito ?? (tour === 'all' ? undefined : tour);
    const issueState = next.estado ?? (state === 'all' ? undefined : state);
    const nextPage = next.page ?? '1';
    if (circuit) params.set('circuito', circuit);
    if (issueState) params.set('estado', issueState);
    if (nextPage !== '1') params.set('page', nextPage);
    return `/cobertura${params.size ? `?${params}` : ''}#revision`;
  };
  const tourCount = (selected: 'all' | 'atp' | 'wta') => report.issues.filter(issue => selected === 'all' || issue.tour === selected).length;
  const stateCount = (selected: CoverageIssueState | 'all') => report.issues.filter(issue => (tour === 'all' || issue.tour === tour) && (selected === 'all' || issue.state === selected)).length;
  return <section className={styles.section} id="revision" aria-labelledby="revision-title">
    <header className={styles.heading}><div><span>Control del archivo</span><h2 id="revision-title">Qué está revisado y qué queda por resolver.</h2></div><p>Una incidencia confirmada no es lo mismo que una edición cuyo tamaño no puede certificarse. DEUCE conserva ambos estados por separado y nunca completa un resultado por estimación.</p></header>
    <div className={styles.overview}>
      <div className={styles.primaryMetric}><strong>{number(report.summary.editions)}</strong><span>ediciones analizadas</span><p>ATP y WTA se comprueban de forma independiente.</p></div>
      <dl><div data-tone="alert"><dt>Incidencias demostrables</dt><dd>{number(report.summary.confirmed)}</dd></div><div><dt>Alcance por verificar</dt><dd>{number(report.summary.verification)}</dd></div><div><dt>Coincidencias candidatas</dt><dd>{number(report.summary.conflicts)}</dd></div><div data-tone="queue"><dt>Cohortes históricas en cola</dt><dd>{number(report.summary.queuedCohorts)}</dd></div></dl>
    </div>
    <div className={styles.controls}>
      <nav aria-label="Circuito del control del archivo">{(['all', 'atp', 'wta'] as const).map(value => <Link key={value} href={href({ circuito: value === 'all' ? '' : value, page: '1' })} aria-current={tour === value ? 'page' : undefined}>{value === 'all' ? 'ATP + WTA' : value.toUpperCase()} <span>{number(tourCount(value))}</span></Link>)}</nav>
      <nav aria-label="Estado del control del archivo">{(['all', 'confirmed', 'review', 'queued'] as const).map(value => <Link key={value} href={href({ estado: value === 'all' ? '' : value, page: '1' })} aria-current={state === value ? 'page' : undefined}>{stateLabels[value]} <span>{number(stateCount(value))}</span></Link>)}</nav>
    </div>
    <div className={styles.ledger}>
      <header><div><h3>Listado trazable</h3><p>{number(filtered.length)} controles en esta vista</p></div><p>Los estados “por verificar” describen límites de la evidencia, no partidos confirmados como ausentes.</p></header>
      {visible.length ? <ol>{visible.map(issue => <li key={issue.id} data-state={issue.state}><div className={styles.issueIdentity}><span>{issue.tour.toUpperCase()} · {kindLabels[issue.kind]}</span><strong>{issue.title}</strong>{issue.category && <small>{issue.category}</small>}</div><p>{issue.detail}</p><dl><div><dt>Estado</dt><dd>{stateLabels[issue.state]}</dd></div>{issue.sourceRows !== undefined && <div><dt>Filas de origen</dt><dd>{number(issue.sourceRows)}</dd></div>}<div><dt>Elementos</dt><dd>{number(issue.count)}</dd></div></dl></li>)}</ol> : <p className={styles.empty}>No hay controles en esta combinación.</p>}
      <Pagination page={page} total={filtered.length} href={next => href({ page: String(next) })} mobileJumps />
    </div>
    <details className={styles.external}><summary>Comprobaciones externas realizadas <span>{reviewedFinals.length}</span></summary><p>Finales ATP contrastadas manualmente con una fuente oficial independiente del proveedor. Una discrepancia conserva el partido en revisión.</p><ul>{reviewedFinals.map(reference => <li key={`${reference.tournament}-${reference.year}`}><span><strong>{reference.tournament} · {reference.year}</strong>{reference.winner} contra {reference.loser}</span><a href={reference.source} target="_blank" rel="noreferrer">Fuente oficial ↗</a></li>)}</ul></details>
  </section>;
}
