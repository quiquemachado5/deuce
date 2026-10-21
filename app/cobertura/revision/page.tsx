import Link from 'next/link';
import { preparedGeneration } from '@/lib/revista/read-records';
import { conflictCandidates } from '@/lib/archive-review';
import { number } from '@/lib/cuaderno/model';
import { tournamentName } from '@/lib/labels';
import { reviewedFinals, referenceFinal, referenceIssue } from '@/lib/reviewed-finals';
import '../coverage.css';
export const metadata = {title:'Revisión histórica — DEUCE',alternates:{canonical:'/cobertura/revision'}};
export const revalidate = 300;
export default async function Review() {
  const g = await preparedGeneration(), matches = await g.matches(), groups = conflictCandidates(matches);
  const missingRank = matches.filter(m => m.year >= 2023 && m.context?.rankLabel !== 'Ranking al jugar');
  return <div className="nc-wrap"><Link className="dx-inline-link" href="/cobertura">Cobertura</Link><header className="dx-page-heading"><h1>Revisión del archivo</h1><p>Resultados contrastados y coincidencias pendientes de comprobar.</p></header>
    <div className="dx-evidence-summary"><div><span>Grupos candidatos a revisión</span><strong>{number(groups.length)}</strong><p>No son duplicados confirmados.</p></div><div><span>Sin ranking histórico desde 2023</span><strong>{number(missingRank.length)}</strong><p>No se sustituye por el ranking actual ni por el del día de descarga.</p></div></div>
    <section className="coverage-reviewed"><h2>Finales contrastadas con ATP</h2><p>Ganador, sets y tie-breaks comprobados con una fuente independiente del proveedor. Una discrepancia deja el resultado en revisión.</p>
      <ul>{reviewedFinals.map(reference => {
        const match = matches.find(candidate => referenceFinal(candidate) === reference);
        return <li key={`${reference.tournament}-${reference.year}`}><div><strong>{reference.winner} contra {reference.loser}</strong><span>{tournamentName(reference.tournament)} · {reference.year}</span></div>
          <p>{reference.score.replaceAll(' ', ', ')}</p><div className="coverage-reviewed-links">{match ? <Link href={`/match/${match.match_id}`}>{referenceIssue(match) ? 'En revisión' : 'Ver partido contrastado'}</Link> : <span>Sin registro en esta generación</span>}<a href={reference.source} target="_blank" rel="noreferrer">Fuente ATP</a><span>Revisado: {new Date(`${reference.reviewed}T12:00:00Z`).toLocaleDateString('es-ES')}</span></div>
        </li>;
      })}</ul>
    </section>
    <aside className="dx-notice">Criterio: mismo año, torneo, ronda y pareja de jugadores. Una ciudad puede celebrar más de una edición; algunas fechas representan el inicio del torneo. Se conservan identificadores, resultados y procedencia hasta contrastar una fuente.</aside>
    {groups.map(group => <section className="dx-evidence-list" key={group.key}><p className="dx-eyebrow">PENDIENTE DE CONTRASTE · {group.kind}</p><h2>{group.rows[0].player1.name} / {group.rows[0].player2.name}</h2><p>{tournamentName(group.rows[0].tournament)} · {group.rows[0].year} · {group.rows[0].round}</p><ul>{group.rows.map(m => <li key={m.match_id}><Link className="dx-inline-link" href={`/match/${m.match_id}`}>{m.final_score} · {(m.context?.date || m.score_summary.timestamp).slice(0,10)}</Link> — {m.context?.dateLabel || 'Precisión de fecha no documentada'} <small>({m.match_id})</small></li>)}</ul></section>)}
    <p className="dx-provenance">Versión {g.manifest.version}. Revisión no destructiva; ningún candidato se ha fusionado automáticamente.</p>
  </div>;
}
