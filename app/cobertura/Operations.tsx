import Link from 'next/link';
import {cloudProbeRead} from '@/lib/cloud-archive';
import {operationHistory,operationStatus,wtaBackfillProgress} from '@/lib/archive-operations';
import {editionCompleteness} from '@/lib/edition-audit';
import {preparedEditionAudit} from '@/lib/revista/read-records';
import type {IngestionDay,RecordManifest} from '@/lib/revista/snapshot';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import styles from './coverage.module.css';

type Entry=Record<string,unknown>;
type DailyActivity={
  date:string;
  atpCalls:number;wtaCalls:number;
  atpExtracted:number;wtaExtracted:number;
  atpMeasured:boolean;wtaMeasured:boolean;
  published:number;corrected:number;publicationMeasured:boolean;
  statuses:string[];initialSeed:boolean;
};

const number=(value:number)=>value.toLocaleString('es-ES');
const numeric=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:undefined;
const iso=(entry:Entry)=>typeof (entry.attemptAt||entry.at)==='string'?String(entry.attemptAt||entry.at):undefined;
const dateKey=(entry:Entry)=>iso(entry)?.slice(0,10);
const stamp=(date?:string)=>date?new Date(date).toLocaleString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC':'Sin registro';
const dayLabel=(date:string)=>new Date(`${date}T12:00:00Z`).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
const labels:Record<string,string>={success:'Correcto',running:'En curso',error:'Con error','quota-reserve':'Esperando cuota','free-history-limit':'Cuota agotada','backfill-progress':'En progreso','storage-reserve':'Sin espacio','storage-unverified':'Sin verificar',unavailable:'Sin registro',busy:'En curso'};
const friendlyReason=(reason?:string)=>{
  if(!reason)return undefined;
  if(/HTTP 403/i.test(reason))return 'El proveedor rechazó la consulta (HTTP 403).';
  if(/free monthly history|history allowance/i.test(reason))return 'La cuota histórica gratuita está agotada. El progreso está guardado.';
  if(/quota/i.test(reason))return 'La consulta espera a que vuelva a haber cuota.';
  return reason;
};
const emptyDay=(date:string):DailyActivity=>({date,atpCalls:0,wtaCalls:0,atpExtracted:0,wtaExtracted:0,atpMeasured:false,wtaMeasured:false,published:0,corrected:0,publicationMeasured:false,statuses:[],initialSeed:false});

function dailyActivity(atpRaw:unknown,wtaRaw:unknown,publishRaw:unknown,ingestion:IngestionDay[]|undefined){
  const days=new Map<string,DailyActivity>();
  const get=(date:string)=>{const saved=days.get(date)||emptyDay(date);days.set(date,saved);return saved};
  const addProvider=(raw:unknown,tour:'atp'|'wta')=>{
    for(const entry of operationHistory(raw)){
      const date=dateKey(entry);if(!date)continue;
      const day=get(date),calls=numeric(entry.calls),extracted=numeric(entry.extracted)??numeric(entry.updated);
      if(calls!==undefined)day[tour==='atp'?'atpCalls':'wtaCalls']+=calls;
      if(extracted!==undefined){day[tour==='atp'?'atpExtracted':'wtaExtracted']+=extracted;day[tour==='atp'?'atpMeasured':'wtaMeasured']=true;}
      if(typeof entry.status==='string')day.statuses.push(entry.status);
    }
  };
  addProvider(atpRaw,'atp');addProvider(wtaRaw,'wta');
  for(const entry of operationHistory(publishRaw)){
    const date=dateKey(entry);if(!date)continue;
    const day=get(date),delta=entry.delta&&typeof entry.delta==='object'?entry.delta as Entry:undefined;
    day.initialSeed=day.initialSeed||entry.initialSeed===true;
    if(!day.initialSeed&&delta){
      const added=numeric(delta.added),corrected=numeric(delta.corrected);
      if(added!==undefined&&corrected!==undefined){day.published+=added;day.corrected+=corrected;day.publicationMeasured=true;}
    }
    if(typeof entry.status==='string')day.statuses.push(entry.status);
  }
  for(const entry of ingestion||[]){
    const day=get(entry.date);
    if(!day.publicationMeasured&&!day.initialSeed&&entry.included){day.published=entry.added;day.corrected=entry.corrected||0;day.publicationMeasured=true;}
  }
  return [...days.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,14);
}

function activityStatus(day:DailyActivity){
  if(day.statuses.includes('error'))return 'Con incidencia';
  if(day.statuses.includes('free-history-limit')||day.statuses.includes('quota-reserve'))return 'Esperando cuota';
  if(day.initialSeed)return 'Copia inicial';
  if(day.statuses.includes('running')||day.statuses.includes('busy'))return 'En curso';
  if(day.statuses.includes('success'))return 'Completado';
  return 'Sin detalle';
}
const value=(measured:boolean,total:number)=>measured?number(total):'—';

export default async function Operations({manifest,source}:{manifest:RecordManifest;source:'bundled'|'remote'}){
  const [atpRaw,wtaRaw,publishRaw,index,editions,localBackfill]=await Promise.all([
    cloudProbeRead('sync-status'),cloudProbeRead('wta-sync-status'),cloudProbeRead('publish-status'),cloudProbeRead('wta-archive-index'),preparedEditionAudit(),
    readFile(join(process.cwd(),'data','archive','wta-status.json'),'utf8').then(JSON.parse).catch(()=>undefined),
  ]);
  const current=[
    {name:'ATP',kind:'provider',raw:atpRaw,...operationStatus(atpRaw)},
    {name:'WTA',kind:'provider',raw:wtaRaw,...operationStatus(wtaRaw)},
    {name:'Web',kind:'publication',raw:publishRaw,...operationStatus(publishRaw)},
  ];
  const days=dailyActivity(atpRaw,wtaRaw,publishRaw,manifest.ingestionHistory);
  const todayKey=new Date().toISOString().slice(0,10),today=days.find(day=>day.date===todayKey)||emptyDay(todayKey);
  const progress=wtaBackfillProgress(index);
  const completed=progress?.completed??(typeof localBackfill?.completedHistoricalCohorts==='number'?localBackfill.completedHistoricalCohorts:undefined);
  const total=progress?.total??165;
  const partial=localBackfill?.active?.complete===false?localBackfill.active:undefined;
  const review=editions.filter(row=>editionCompleteness(row).completeDraw===false).length;
  return <>
    <section className={styles.operations} aria-labelledby="operations-title">
      <header className={styles.heading}>
        <div><span>Actualización diaria</span><h2 id="operations-title">Lo que ha cambiado hoy.</h2></div>
        <p>Cada consulta y cada incorporación quedan registradas. Solo contamos como publicado lo que ya puede verse en DEUCE.</p>
      </header>

      <article className={styles.todayCard} aria-label="Actividad de hoy">
        <header><div><span>Hoy · {dayLabel(today.date)}</span><h3>{today.publicationMeasured?`${number(today.published)} partidos nuevos publicados.`:'Aún no hay una publicación nueva verificada.'}</h3></div><span className={styles.dayStatus}>{activityStatus(today)}</span></header>
        <dl className={styles.todayNumbers}>
          <div><dt>Consultas a la API</dt><dd>{number(today.atpCalls+today.wtaCalls)}<small>ATP {number(today.atpCalls)} · WTA {number(today.wtaCalls)}</small></dd></div>
          <div><dt>Resultados obtenidos</dt><dd>{today.atpMeasured||today.wtaMeasured?number(today.atpExtracted+today.wtaExtracted):'—'}<small>ATP {value(today.atpMeasured,today.atpExtracted)} · WTA {value(today.wtaMeasured,today.wtaExtracted)}</small></dd></div>
          <div><dt>Añadidos a DEUCE</dt><dd>{value(today.publicationMeasured,today.published)}<small>{today.publicationMeasured?`${number(today.corrected)} corregidos`:'Pendiente de una publicación medible'}</small></dd></div>
        </dl>
        <ul className={styles.current}>{current.map(operation=>{
        const raw=operation.raw&&typeof operation.raw==='object'?operation.raw as Entry:{};
        const calls=numeric(raw.calls),extracted=numeric(raw.extracted)??numeric(raw.updated);
        return <li key={operation.name} data-status={operation.status}><strong>{operation.name}</strong><span>{operation.kind==='provider'?`${calls===undefined?'—':number(calls)} consultas · ${extracted===undefined?'—':number(extracted)} resultados`:`Última publicación ${stamp(operation.publicationAt||operation.successAt)}`}</span><span className={styles.status}><i aria-hidden="true"/>{labels[operation.status]||operation.status}</span>{friendlyReason(operation.reason)&&<small>{friendlyReason(operation.reason)}</small>}</li>;
      })}</ul>
        <p className={styles.source}>{source==='remote'?'Datos servidos desde la generación principal.':'Datos servidos desde la copia validada.'} Un guion indica que el intento no dejó una cifra verificable.</p>
      </article>
    </section>

    <section className={styles.history} aria-labelledby="coverage-daily-title">
      <header><span>Historial público</span><h2 id="coverage-daily-title">Cada día, en claro.</h2><p>Consultas realizadas, resultados obtenidos y partidos que finalmente se incorporaron al archivo.</p></header>
      <ol className={styles.days} aria-label="Actividad diaria de la API">{days.map(day=><li key={day.date}>
        <header><time dateTime={day.date}>{dayLabel(day.date)}</time><span className={styles.dayStatus}>{activityStatus(day)}</span></header>
        <dl><div><dt>Consultas</dt><dd>{number(day.atpCalls+day.wtaCalls)}<small>ATP {number(day.atpCalls)} · WTA {number(day.wtaCalls)}</small></dd></div><div><dt>Obtenidos</dt><dd>{day.atpMeasured||day.wtaMeasured?number(day.atpExtracted+day.wtaExtracted):'—'}<small>ATP {value(day.atpMeasured,day.atpExtracted)} · WTA {value(day.wtaMeasured,day.wtaExtracted)}</small></dd></div><div><dt>Añadidos</dt><dd>{value(day.publicationMeasured,day.published)}<small>{day.publicationMeasured?`${number(day.corrected)} corregidos`:'Sin medición verificable'}</small></dd></div></dl>
      </li>)}</ol>
    </section>

    <section className={styles.archive} aria-label="Archivo histórico y revisión">
      <article><div><span>Archivo WTA</span><strong>{completed===undefined?'—':`${number(completed)} / ${number(total)}`}</strong></div><p>{partial?`${number(partial.rows)} filas de ${partial.season} guardadas; todavía no se publican.`:progress?.pending.length?`${number(progress.pending.length)} cohortes pendientes; el proceso continuará desde el último punto guardado.`:'Sin descarga parcial activa.'}</p>{localBackfill?.paused==='free-history-limit'&&<small>En pausa hasta que vuelva la cuota histórica gratuita.</small>}</article>
      <article><div><span>Revisión histórica</span><strong>{number(review)}</strong></div><p>Ediciones incompletas o cuyo cuadro todavía necesita contraste.</p><Link href="/cobertura/revision">Ver revisión →</Link></article>
    </section>
  </>;
}
