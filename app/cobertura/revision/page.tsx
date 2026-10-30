import Link from 'next/link';
import { preparedEditionAudit, preparedGeneration } from '@/lib/revista/read-records';
import { conflictCandidates } from '@/lib/archive-review';
import { number } from '@/lib/cuaderno/model';
import { tournamentName } from '@/lib/labels';
import { reviewedFinals, referenceFinal, referenceIssue } from '@/lib/reviewed-finals';
import { tournamentDirectory } from '@/lib/tournament-directory';
import { Pagination } from '@/components/nocturno/Row';
export const metadata = {title:'Revisión histórica — DEUCE',alternates:{canonical:'/cobertura/revision'}};
export const revalidate = 300;
export default async function Review({searchParams}:{searchParams:Promise<{circuito?:string;page?:string}>}) {
  const [g,audit,query]=await Promise.all([preparedGeneration(),preparedEditionAudit(),searchParams]), matches = await g.matches(), groups = conflictCandidates(matches);
  const tour=query.circuito==='wta'?'wta':'atp';
  const incomplete=audit.filter(row=>(row.tour||'atp')===tour&&row.completeDraw===false);
  const page=Math.max(1,Math.min(Math.ceil(incomplete.length/25)||1,Number(query.page)||1));
  const visibleIncomplete=incomplete.slice((page-1)*25,page*25);
  const slugs=new Map(tournamentDirectory(matches).map(entry=>[entry.name,entry.slug]));
  const auditUrl=(nextTour:'atp'|'wta',nextPage=1)=>`/cobertura/revision?circuito=${nextTour}${nextPage>1?`&page=${nextPage}`:''}`;
  const missingRank = matches.filter(m => m.year >= 2023 && m.context?.rankLabel !== 'Ranking al jugar');
  return <div className="nc-wrap"><Link className="dx-inline-link" href="/cobertura">Cobertura</Link><header className="dx-page-heading"><h1>Revisión del archivo</h1><p>Resultados contrastados y coincidencias pendientes de comprobar.</p></header>
    <div className="dx-evidence-summary"><div><span>Grupos candidatos a revisión</span><strong>{number(groups.length)}</strong><p>No son duplicados confirmados.</p></div><div><span>Sin ranking histórico desde 2023</span><strong>{number(missingRank.length)}</strong><p>No se sustituye por el ranking actual ni por el del día de descarga.</p></div></div>
    <section className="coverage-edition-audit" aria-labelledby="edition-audit-title">
      <div className="coverage-edition-audit-head"><div><p className="dx-eyebrow">CONTROL DE CUADROS</p><h2 id="edition-audit-title">Ediciones que requieren contraste</h2><p>Señalamos partidos pendientes y rondas tardías ausentes. Nunca se inventa un marcador para cerrar un cuadro.</p></div><nav aria-label="Circuito del control de cuadros"><Link href={auditUrl('atp')} aria-current={tour==='atp'?'page':undefined}>ATP</Link><Link href={auditUrl('wta')} aria-current={tour==='wta'?'page':undefined}>WTA</Link></nav></div>
      {visibleIncomplete.length?<ul>{visibleIncomplete.map(row=>{const slug=slugs.get(row.tournament);return <li key={`${row.tour}-${row.tournament}-${row.year}-${row.category}`}><div><strong>{tournamentName(row.tournament)} · {row.year}</strong><span>{row.category} · {tour.toUpperCase()}</span></div><dl><div><dt>Pendientes</dt><dd>{number(row.pending)}</dd></div><div><dt>Huecos tardíos</dt><dd>{row.missingLateRounds.length?row.missingLateRounds.join(' · '):'Ninguno'}</dd></div><div><dt>Filas de origen</dt><dd>{number(row.sourceRows)}</dd></div></dl>{slug&&<Link href={`/torneos/${slug}/${row.year}?cuadro=${tour}`}>Abrir edición</Link>}</li>})}</ul>:<p className="coverage-edition-empty">No hay ediciones {tour.toUpperCase()} publicadas que requieran contraste.</p>}
      {incomplete.length>25&&<Pagination page={page} total={incomplete.length} href={next=>auditUrl(tour,next)}/>}
    </section>
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
