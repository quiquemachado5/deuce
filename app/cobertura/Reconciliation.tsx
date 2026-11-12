'use client';
import {useState} from 'react';
import Link from 'next/link';
import type {CoverageReconciliation} from '@/lib/coverage-reconciliation';
import styles from './reconciliation.module.css';

type PendingCase={id:string;first:string;second:string;year:number;tour:string;reason:string;sources:string[]};
export default function Reconciliation({report,pendingCases=[]}:{report:CoverageReconciliation;pendingCases?:PendingCase[]}){
 const [tour,setTour]=useState('all'),[state,setState]=useState('confirmed'),[query,setQuery]=useState(''),[page,setPage]=useState(1);
 const rows=report.issues.filter(issue=>(tour==='all'||issue.tour===tour)&&(state==='all'||(state==='confirmed'?issue.state==='confirmed':state==='review'?issue.kind==='verification':issue.kind===state))&&`${issue.title} ${issue.tournament||''} ${issue.year||''}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
 const change=(action:()=>void)=>{action();setPage(1);};
 const pages=Math.max(1,Math.ceil(rows.length/8));
 return <section className={styles.section} id="calidad">
  <header className={styles.heading}><h2>Revisión del archivo</h2><p>Lo que sigue pendiente, sin confundir un resultado dudoso con un cuadro aún no certificado.</p></header>
  <div className={styles.pending}><strong>{report.summary.pendingRows.toLocaleString('es')}</strong><div><h3>Resultados por resolver</h3><p>Marcadores o estados que todavía no pueden incorporarse a las estadísticas.</p></div></div>
  {pendingCases.length>0&&<details className={styles.pendingCases}><summary>Ver los {pendingCases.length} resultados pendientes</summary><ul>{pendingCases.map(row=><li key={row.id}><h3>{row.first} / {row.second}</h3><span>{row.tour.toUpperCase()} · {row.year}</span><p>{row.reason}</p><div>{row.sources.map((url,index)=><a key={url} href={url} target="_blank" rel="noreferrer">Fuente {index+1}<span className={styles.srOnly}> de {row.first} / {row.second} (abre en otra pestaña)</span></a>)}</div></li>)}</ul></details>}
  <details className={styles.explorer}>
   <summary>Consultar incidencias y verificaciones <span>{report.issues.length.toLocaleString('es')} expedientes</span></summary>
   <div className={styles.statusGrid}>
    <button onClick={()=>change(()=>setState('confirmed'))} aria-pressed={state==='confirmed'}><strong>{report.summary.confirmed.toLocaleString('es')}</strong><span>Ediciones con incidencias</span><small>Una anomalía demostrada en resultados o rondas.</small></button>
    <button onClick={()=>change(()=>setState('review'))} aria-pressed={state==='review'}><strong>{report.summary.verification.toLocaleString('es')}</strong><span>Cuadros por certificar</span><small>No implica que falten partidos.</small></button>
    <button onClick={()=>change(()=>setState('conflict'))} aria-pressed={state==='conflict'}><strong>{report.summary.conflicts.toLocaleString('es')}</strong><span>Fuentes en conflicto</span><small>Versiones distintas del mismo resultado.</small></button>
   </div>
   <div className={styles.controls}><label>Tipo de revisión<select value={state} onChange={event=>change(()=>setState(event.target.value))}><option value="confirmed">Incidencias demostradas</option><option value="review">Cuadros por certificar</option><option value="conflict">Fuentes en conflicto</option><option value="ranking">Ranking histórico ({report.summary.rankingGroups})</option>{report.summary.queuedCohorts>0&&<option value="history">Histórico pendiente</option>}<option value="all">Todas las revisiones</option></select></label><label>Circuito<select value={tour} onChange={event=>change(()=>setTour(event.target.value))}><option value="all">ATP y WTA</option><option value="atp">ATP</option><option value="wta">WTA</option></select></label><label>Buscar edición<input value={query} placeholder="Torneo o año" onChange={event=>change(()=>setQuery(event.target.value))}/></label></div>
   <p className={styles.resultCount} role="status">{rows.length.toLocaleString('es')} expedientes en esta selección</p>
   <div className={styles.issueList}>{rows.slice((page-1)*8,page*8).map(issue=><article key={issue.id}><div><h3>{issue.title}</h3><span>{issue.tour.toUpperCase()} · {issue.category||'Archivo'}</span></div><p>{issue.detail}</p>{issue.tournament&&<Link href={'/partidos?tour='+issue.tour+'&year='+issue.year+'&tournament='+encodeURIComponent(issue.tournament)}>Consultar partidos</Link>}</article>)}</div>
   {!rows.length&&<p>No hay expedientes en esta selección.</p>}
   {pages>1&&<nav className={styles.pages} aria-label="Expedientes"><button disabled={page===1} onClick={()=>setPage(value=>value-1)}>Anterior</button><span>{page} de {pages}</span><button disabled={page===pages} onClick={()=>setPage(value=>value+1)}>Siguiente</button></nav>}
  </details>
  <p className={styles.note}>Cada corrección conserva sus fuentes. Si no hay evidencia suficiente, el caso permanece abierto.</p>
 </section>;
}
