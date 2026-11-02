import Link from 'next/link';
import {cloudProbeRead} from '@/lib/cloud-archive';
import {operationStatus,wtaBackfillProgress} from '@/lib/archive-operations';
import {preparedEditionAudit} from '@/lib/revista/read-records';
import type {RecordManifest} from '@/lib/revista/snapshot';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import styles from './coverage.module.css';

const stamp=(date?:string)=>date?new Date(date).toLocaleString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC':'Sin registro';
const labels:Record<string,string>={success:'Correcto',running:'En curso',error:'Con error','quota-reserve':'Esperando cuota','storage-reserve':'Sin espacio','storage-unverified':'Sin verificar',unavailable:'Sin registro',busy:'En curso'};

export default async function Operations({manifest,source}:{manifest:RecordManifest;source:'bundled'|'remote'}){
  const [atpRaw,wtaRaw,publishRaw,index,editions,localBackfill]=await Promise.all([
    cloudProbeRead('sync-status'),cloudProbeRead('wta-sync-status'),cloudProbeRead('publish-status'),cloudProbeRead('wta-archive-index'),preparedEditionAudit(),
    readFile(join(process.cwd(),'data','archive','wta-status.json'),'utf8').then(JSON.parse).catch(()=>undefined),
  ]);
  const operations=[
    {name:'ATP',window:'04:00–04:59',...operationStatus(atpRaw)},
    {name:'WTA',window:'06:00–06:59',...operationStatus(wtaRaw)},
    {name:'Publicación',window:'08:00–08:59',...operationStatus(publishRaw)},
  ];
  const progress=wtaBackfillProgress(index);
  const completed=progress?.completed??(typeof localBackfill?.completedHistoricalCohorts==='number'?localBackfill.completedHistoricalCohorts:undefined);
  const total=progress?.total??165;
  const partial=localBackfill?.active?.complete===false?localBackfill.active:undefined;
  const today=manifest.ingestionHistory?.find(day=>day.date===new Date().toISOString().slice(0,10));
  const review=editions.filter(row=>row.completeDraw!==true).length;
  return <>
    <section className={styles.operations} aria-labelledby="operations-title">
      <header className={styles.heading}>
        <div><span>Actualización diaria</span><h2 id="operations-title">Tres pasos. Una sola publicación.</h2></div>
        <p>DEUCE consulta cada circuito por separado y solo cambia la web cuando la generación completa supera las validaciones.</p>
      </header>
      <ol className={styles.flow}>{operations.map((operation,index)=><li key={operation.name} data-status={operation.status}>
        <span className={styles.number}>0{index+1}</span>
        <div className={styles.stage}><strong>{operation.name}</strong><small>{operation.window} UTC</small></div>
        <span className={styles.status}><i aria-hidden="true"/>{labels[operation.status]||operation.status}</span>
        <dl><div><dt>Último intento</dt><dd>{stamp(operation.attemptAt)}</dd></div><div><dt>Último éxito</dt><dd>{stamp(operation.successAt)}</dd></div></dl>
        {operation.reason&&<p className={styles.error}>{operation.reason}</p>}
      </li>)}</ol>
      <dl className={styles.today}>
        <div><dt>Nuevos hoy</dt><dd>{today?.included?today.added.toLocaleString('es-ES'):'—'}</dd></div>
        <div><dt>Corregidos hoy</dt><dd>{today?.corrected===undefined?'—':today.corrected.toLocaleString('es-ES')}</dd></div>
        <div><dt>Última publicación</dt><dd>{stamp(operations[2].publicationAt||operations[2].successAt)}</dd></div>
        <div><dt>Generación</dt><dd><code>{manifest.version.slice(0,8)}</code></dd></div>
      </dl>
      <p className={styles.source}>{source==='remote'?'Generación principal remota':'Copia validada incluida en el despliegue'}. Un guion significa que todavía no existe una medición verificable; no equivale a cero.</p>
    </section>

    <section className={styles.archive} aria-labelledby="wta-progress-title">
      <article>
        <span>Archivo WTA</span><h2 id="wta-progress-title">Progreso verificable</h2>
        {completed!==undefined?<><p><strong>{completed}</strong> de {total} cohortes históricas configuradas.</p><progress value={completed} max={total} aria-label="Cohortes WTA descargadas"/><small>{partial?`${partial.rows.toLocaleString('es-ES')} filas de ${partial.season} guardadas en un checkpoint; aún no se publican.`:progress?.pending.length?`${progress.pending.length} pendientes; cada página conserva su checkpoint.`:'Sin descarga parcial activa.'}</small>{localBackfill?.paused==='free-history-limit'&&<p className={styles.limit}>Pausado al agotarse las llamadas gratuitas de History.</p>}</>:<p>No hay un punto de control verificable. La generación activa sigue indicando cuántos partidos WTA contiene.</p>}
      </article>
      <article>
        <span>Integridad</span><h2>Revisión pendiente</h2><p><strong>{review.toLocaleString('es-ES')}</strong> ediciones incompletas o sin tamaño de cuadro verificable.</p>
        <Link href="/cobertura/revision">Ver torneos y motivos →</Link>
      </article>
    </section>
  </>;
}
