import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowLeft,ArrowUpRight} from 'lucide-react';
import {preparedCorrections,preparedGeneration} from '@/lib/revista/read-records';
import {archiveDate} from '@/lib/archive-freshness';
import {publicMatchFacts} from '@/lib/publication-pages';
import styles from './history.module.css';

export const metadata:Metadata={title:'Historial de correcciones — DEUCE',description:'Qué dato cambió en el archivo, cuándo se corrigió y qué fuentes documentan la revisión.',alternates:{canonical:'/cobertura/correcciones'}};
export const revalidate=300;
const labels:Record<keyof ReturnType<typeof publicMatchFacts>,string>={tournament:'Torneo',year:'Año',round:'Ronda',players:'Jugadores',winner:'Ganador',score:'Marcador',status:'Estado',surface:'Superficie',category:'Categoría',playedOn:'Fecha del partido'};
const text=(value:unknown)=>value===null||value===undefined?'Sin especificar':Array.isArray(value)?value.join(' · '):String(value);

export default async function Corrections({searchParams}:{searchParams:Promise<{page?:string}>}){
 const [rows,{manifest},query]=await Promise.all([preparedCorrections(),preparedGeneration(),searchParams]);
 const last=Math.max(1,Math.ceil(rows.length/20)),page=Math.min(last,Math.max(1,Math.trunc(Number(query.page)||1)));
 const selected=rows.slice((page-1)*20,page*20);
 return <main className={styles.page}>
  <Link className={styles.back} href="/cobertura"><ArrowLeft size={17} aria-hidden="true"/> Cobertura</Link>
  <header><h1>Historial de correcciones</h1><p>El dato anterior, el nuevo y las fuentes de la revisión.</p></header>
  {selected.length?<ol className={styles.list}>{selected.map(row=>{
   const id=row.identity.slice(row.identity.indexOf(':')+1);
   const changes=(Object.keys(row.after) as Array<keyof typeof row.after>).filter(key=>JSON.stringify(row.before[key])!==JSON.stringify(row.after[key]));
   return <li key={`${row.identity}:${row.at}`}><article>
    <div className={styles.heading}><Link href={`/match/${id}`}>{row.after.players.join(' – ')}<ArrowUpRight size={18} aria-hidden="true"/></Link><time dateTime={row.at}>{archiveDate(row.at)}</time></div>
    <p className={styles.event}>{row.identity.startsWith('wta:')?'WTA':'ATP'} · {row.after.tournament} {row.after.year}</p>
    <dl>{changes.map(key=><div key={key}><dt>{labels[key]}</dt><dd><span>{text(row.before[key])}</span><span aria-hidden="true">→</span><strong>{text(row.after[key])}</strong></dd></div>)}</dl>
    <div className={styles.sources}>{row.sources.length?row.sources.map((url,index)=><a key={url} href={url} target="_blank" rel="noopener noreferrer">Fuente {index+1} · {new URL(url).hostname}<ArrowUpRight size={14} aria-hidden="true"/></a>):<span>Publicación archivada del proveedor · {id}</span>}</div>
   </article></li>;
  })}</ol>:<p className={styles.empty}>Las correcciones se registran automáticamente con cada nueva publicación. No se atribuyen fechas anteriores al inicio de este historial.</p>}
  {last>1&&<nav className={styles.pagination} aria-label="Páginas del historial">{page>1&&<Link href={`?page=${page-1}`}>Anterior</Link>}<span>{page} / {last}</span>{page<last&&<Link href={`?page=${page+1}`}>Siguiente</Link>}</nav>}
  <p className={styles.note}>Se muestran las últimas {Math.min(1000,rows.length)} correcciones de la generación activa. Publicación: <time dateTime={manifest.generatedAt}>{archiveDate(manifest.generatedAt)}</time>. El archivo interno conserva cada lote completo de revisiones.</p>
 </main>;
}
