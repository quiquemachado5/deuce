import {cloudProbeRead} from '@/lib/cloud-archive';
import {operationHistory,operationStatus} from '@/lib/archive-operations';
import type {IngestionDay,RecordManifest} from '@/lib/revista/snapshot';
import {SITE_ORIGIN} from '@/lib/site-origin';
import styles from './coverage.module.css';

type Entry=Record<string,unknown>;
type Tour='atp'|'wta';
type DailyActivity={
  date:string;
  atpCalls:number;wtaCalls:number;atpCallsMeasured:boolean;wtaCallsMeasured:boolean;
  atpExtracted:number;wtaExtracted:number;atpMeasured:boolean;wtaMeasured:boolean;
  atpAdded:number;wtaAdded:number;splitMeasured:boolean;
  published:number;corrected:number;publicationMeasured:boolean;
  statuses:string[];initialSeed:boolean;
  atpProviderDate?:string;wtaProviderDate?:string;
};

const number=(value:number)=>value.toLocaleString('es-ES');
const numeric=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:undefined;
const iso=(entry:Entry)=>typeof (entry.attemptAt||entry.at)==='string'?String(entry.attemptAt||entry.at):undefined;
const dateKey=(entry:Entry)=>iso(entry)?.slice(0,10);
const dayLabel=(date:string)=>new Date(`${date}T12:00:00Z`).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
const emptyDay=(date:string):DailyActivity=>({
  date,
  atpCalls:0,wtaCalls:0,atpCallsMeasured:false,wtaCallsMeasured:false,
  atpExtracted:0,wtaExtracted:0,atpMeasured:false,wtaMeasured:false,
  atpAdded:0,wtaAdded:0,splitMeasured:false,
  published:0,corrected:0,publicationMeasured:false,statuses:[],initialSeed:false,
});

function dailyActivity(atpRaw:unknown,wtaRaw:unknown,publishRaw:unknown,ingestion:IngestionDay[]|undefined){
  const days=new Map<string,DailyActivity>();
  const get=(date:string)=>{const saved=days.get(date)||emptyDay(date);days.set(date,saved);return saved};
  const addProvider=(raw:unknown,tour:Tour)=>{
    for(const entry of operationHistory(raw)){
      const date=dateKey(entry);if(!date)continue;
      const day=get(date),calls=numeric(entry.calls),extracted=numeric(entry.extracted)??numeric(entry.updated);
      if(calls!==undefined){day[tour==='atp'?'atpCalls':'wtaCalls']+=calls;day[tour==='atp'?'atpCallsMeasured':'wtaCallsMeasured']=true;}
      if(extracted!==undefined){day[tour==='atp'?'atpExtracted':'wtaExtracted']+=extracted;day[tour==='atp'?'atpMeasured':'wtaMeasured']=true;}
      if(typeof entry.latestProviderDate==='string')day[tour==='atp'?'atpProviderDate':'wtaProviderDate']=entry.latestProviderDate;
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
      const tours=delta.tours&&typeof delta.tours==='object'?delta.tours as Entry:undefined;
      const atp=tours?.atp&&typeof tours.atp==='object'?tours.atp as Entry:undefined;
      const wta=tours?.wta&&typeof tours.wta==='object'?tours.wta as Entry:undefined;
      const atpAdded=numeric(atp?.added),wtaAdded=numeric(wta?.added);
      if(atpAdded!==undefined&&wtaAdded!==undefined){day.atpAdded+=atpAdded;day.wtaAdded+=wtaAdded;day.splitMeasured=true;}
    }
    if(typeof entry.status==='string')day.statuses.push(entry.status);
  }
  for(const entry of ingestion||[]){
    const day=get(entry.date);
    if(!day.publicationMeasured&&!day.initialSeed&&entry.included){day.published=entry.added;day.corrected=entry.corrected||0;day.publicationMeasured=true;}
    if(!day.splitMeasured&&entry.tourAdded){day.atpAdded=entry.tourAdded.atp;day.wtaAdded=entry.tourAdded.wta;day.splitMeasured=true;}
  }
  return [...days.values()].sort((a,b)=>b.date.localeCompare(a.date));
}

function activityStatus(day:DailyActivity){
  if(day.statuses.includes('error'))return 'Con incidencia';
  if(day.statuses.includes('free-history-limit')||day.statuses.includes('quota-reserve'))return 'Esperando cuota';
  if(day.statuses.includes('running')||day.statuses.includes('busy'))return 'En curso';
  if(day.statuses.includes('success'))return 'Completado';
  return day.publicationMeasured||day.initialSeed?'Incluido en el archivo':'Actividad registrada';
}
const value=(measured:boolean,total:number)=>measured?number(total):'—';
const statusCopy=(status:string)=>({
  success:'Actualización completada',
  'backfill-progress':'Histórico en ampliación',
  'free-history-limit':'Límite histórico del plan',
  'quota-reserve':'En espera por cuota',
  'storage-reserve':'Almacenamiento en reserva',
  'storage-unverified':'Almacenamiento por verificar',
  running:'Actualizando ahora',
  busy:'Actualización ya en curso',
  error:'Incidencia en el último intento',
  unavailable:'Archivo publicado',
}[status]||status);
const statusTone=(status:string)=>status==='success'?'active':status==='error'?'error':['free-history-limit','quota-reserve','storage-reserve','storage-unverified'].includes(status)?'warning':'neutral';
const dateTime=(value?:string)=>value?new Date(value).toLocaleString('es-ES',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Madrid'}):null;
const providerDay=(value?:string|null)=>value?new Date(`${value}T12:00:00Z`).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'Sin resultado fechado';

async function developmentOperations(){
  if(process.env.NODE_ENV!=='development')return undefined;
  try{
    const response=await fetch(`${SITE_ORIGIN}/api/health/deep`,{cache:'no-store',signal:AbortSignal.timeout(2_500)});
    if(!response.ok)return undefined;
    const payload=await response.json() as {dailyUpdate?:{atp?:Entry;wta?:Entry;publication?:Entry}};
    return payload.dailyUpdate;
  }catch{return undefined;}
}

export default async function Operations({manifest}:{manifest:RecordManifest}){
  let [atpRaw,wtaRaw,publishRaw]=await Promise.all([
    cloudProbeRead('sync-status'),
    cloudProbeRead('wta-sync-status'),
    cloudProbeRead('publish-status'),
  ]);
  if(!atpRaw&&!wtaRaw){
    const remote=await developmentOperations();
    atpRaw=remote?.atp;wtaRaw=remote?.wta;publishRaw=publishRaw||remote?.publication;
  }
  const history=dailyActivity(atpRaw,wtaRaw,publishRaw,manifest.ingestionHistory);
  const todayKey=new Date().toISOString().slice(0,10),days=history.slice(0,7);
  const providers=(['atp','wta'] as const).map(tour=>({tour,status:operationStatus(tour==='atp'?atpRaw:wtaRaw),freshness:manifest.circuitFreshness?.[tour]}));
  return <section className={styles.operations} aria-labelledby="operations-title">
    <header className={styles.heading}>
      <div><h2 id="operations-title">Actividad diaria</h2><p>La consulta y la fecha del último partido son datos distintos. Si la API no devuelve resultados nuevos, la consulta queda registrada igualmente; las verificaciones con fuentes oficiales pueden añadir resultados sin consumir llamadas.</p></div>
    </header>
    <div className={styles.providerGrid} aria-label="Estado de ingestión por circuito">{providers.map(({tour,status,freshness})=><article className={styles.providerCard} key={tour}>
      <header><strong>{tour.toUpperCase()}</strong><span className={styles.providerStatus} data-tone={statusTone(status.status)}>{statusCopy(status.status)}</span></header>

      <dl>{dateTime(status.attemptAt)?<div><dt>Última consulta</dt><dd>{dateTime(status.attemptAt)}</dd></div>:null}{dateTime(status.successAt)?<div><dt>Última consulta correcta</dt><dd>{dateTime(status.successAt)}</dd></div>:null}<div><dt>Último resultado devuelto</dt><dd>{providerDay(status.latestProviderDate)}</dd></div><div><dt>Último resultado publicado</dt><dd>{providerDay(freshness?.latestExactDate)}</dd></div></dl>
      {status.status==='success'&&status.latestProviderDate&&status.attemptAt?.slice(0,10)!==status.latestProviderDate?<p className={styles.providerNote}>Se consultó correctamente; el proveedor no entregó un resultado {tour.toUpperCase()} terminado posterior.</p>:null}
    </article>)}</div>
    {days.length?<div className={styles.activityDetails}><h3>Últimos días registrados</h3><ol className={styles.days} aria-label="Actividad diaria de la API">{days.map(day=><li key={day.date}>
      <header><time dateTime={day.date}>{day.date===todayKey?'Hoy · ':''}{dayLabel(day.date)}</time><span className={styles.dayStatus}>{activityStatus(day)}</span></header>
      <div className={styles.tourRows}>
        <div><strong>ATP</strong><span><b>{value(day.atpCallsMeasured,day.atpCalls)}</b> llamadas</span><span><b>{value(day.atpMeasured,day.atpExtracted)}</b> recibidos</span><span><b>{value(day.splitMeasured,day.atpAdded)}</b> publicados</span>{day.atpProviderDate?<span className={styles.latestResult}>Resultado más reciente: {providerDay(day.atpProviderDate)}</span>:null}</div>
        <div><strong>WTA</strong><span><b>{value(day.wtaCallsMeasured,day.wtaCalls)}</b> llamadas</span><span><b>{value(day.wtaMeasured,day.wtaExtracted)}</b> recibidos</span><span><b>{value(day.splitMeasured,day.wtaAdded)}</b> publicados</span>{day.wtaProviderDate?<span className={styles.latestResult}>Resultado más reciente: {providerDay(day.wtaProviderDate)}</span>:null}</div>
      </div>
      {day.publicationMeasured?<p className={styles.daySummary}>{day.published?<><strong>{number(day.published)}</strong> altas en esta generación</>:<>Sin altas nuevas</>}{day.corrected>0&&day.corrected<=manifest.matchCount?<> · {number(day.corrected)} corregidos</>:null}</p>:null}
    </li>)}</ol></div>:null}

  </section>;
}
