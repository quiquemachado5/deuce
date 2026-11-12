'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useId,useState,useSyncExternalStore,type CSSProperties,type ReactNode,type PointerEvent} from 'react';
import {TennisCourt} from '@/components/deuce/TennisCourt';
import PlayerFlag from '@/components/PlayerFlag';
import {MatchScoreboard} from '@/components/deuce/MatchScoreboard';
import {playerSlug} from '@/lib/explore';
import {imageFocus} from '@/lib/image-focus';
import {number} from '@/lib/cuaderno/model';
import type {Photo} from '@/lib/imagery';
import type {MatchRecord} from '@/types/deuce';
import styles from './comparison-study.module.css';
type StudyPlayer={name:string;country?:string;photo:Photo|null;played:number;wins:number;losses:number;titles:number;finals:number;rate:number|null;top10:number;straight:number;comebacks:number;deciding:number;surfaces:{surface:string;played:number;won:number;rate:number|null}[];years:{year:number;played:number;wins:number;rate:number|null}[]};
const colors=['oklch(from #17774b l c var(--appearance-hue,157.600))','#ac5034'];
const mobileQuery='(max-width:759px)';
const subscribeViewport=(notify:()=>void)=>{const media=matchMedia(mobileQuery);media.addEventListener('change',notify);return()=>media.removeEventListener('change',notify)};
export default function ComparisonStudy({players,tour,meetings,wins,evolution}:{players:StudyPlayer[];tour:string;meetings:MatchRecord[];wins:number[];evolution:ReactNode}){
 const[surface,setSurface]=useState('clay'),[showAll,setShowAll]=useState(false),[year,setYear]=useState<number>(),[metric,setMetric]=useState<'wins'|'rate'>('wins');
 const mobile=useSyncExternalStore(subscribeViewport,()=>matchMedia(mobileQuery).matches,()=>false),chartWidth=mobile?360:700;
 const chartId=useId(),years=[...new Set(players.flatMap(p=>p.years.map(y=>y.year)))].sort((a,b)=>a-b),selected=year||years.findLast(y=>players.every(p=>p.years.some(row=>row.year===y)))||years.at(-1);
 const maximum=metric==='rate'?100:Math.max(10,Math.ceil(Math.max(0,...players.flatMap(p=>p.years.map(row=>row.wins)))/10)*10);
 const chartValue=(row:StudyPlayer['years'][number])=>metric==='wins'?row.wins:row.rate||0;
 const xs=(y:number)=>35+(y-(years[0]||0))/Math.max(1,(years.at(-1)||0)-(years[0]||0))*(chartWidth-65);
 const selectYear=(e:PointerEvent<HTMLDivElement>)=>{const r=e.currentTarget.getBoundingClientRect();const ratio=Math.max(0,Math.min(1,((e.clientX-r.left)/r.width*chartWidth-35)/(chartWidth-65)));setYear(years[Math.round(ratio*(years.length-1))])};
 const path=(player:StudyPlayer)=>{let previous=-2;return player.years.map(row=>{const command=row.year===previous+1?'L':'M';previous=row.year;return command+xs(row.year).toFixed(1)+' '+(210-chartValue(row)/maximum*175).toFixed(1)}).join(' ')};
 const metrics=[{label:'Victorias',values:players.map(p=>p.wins)},{label:'Efectividad',values:players.map(p=>p.rate),percent:true},{label:'Títulos del archivo',values:players.map(p=>p.titles)},{label:'Finales',values:players.map(p=>p.finals)},{label:'Victorias ante el top 10',values:players.map(p=>p.top10)},{label:'Victorias sin ceder sets',values:players.map(p=>p.straight)},{label:'Remontadas tras perder el primer set',values:players.map(p=>p.comebacks)},{label:'Victorias en el set decisivo',values:players.map(p=>p.deciding)}];
 return <>
 <section className={styles.duelStage} aria-labelledby="study-h2h">
  <header className={styles.duelCaption}><h2 id="study-h2h">Cara a cara.</h2><span>{meetings.length?number(meetings.length)+' encuentros del archivo':'Sin enfrentamientos'}</span></header>
  <div className={styles.duelPhotography}>{players.map((p,i)=><Link className={styles.duelPlayer} href={'/jugadores/'+playerSlug(p.name)+(tour==='wta'?'?tour=wta':'')} key={p.name}>
   <div className={styles.duelImage}>{p.photo&&<Image src={p.photo.src} alt={p.photo.alt} fill sizes="(max-width:759px) 50vw, 560px" priority style={imageFocus(p.photo.objectPosition||'center',p.photo.mobileObjectPosition||p.photo.objectPosition||'center')}/>}</div>
   <div className={styles.duelResult} data-lead={wins[i]>wins[1-i]||undefined}>
    <div className={styles.duelIdentity}><PlayerFlag code={p.country}/><h3>{p.name}</h3></div>
    <div className={styles.duelPlayerScore}><b>{number(wins[i])}</b><span>victorias</span></div>
   </div>
  </Link>)}</div>
 </section>
 <section className={styles.metrics} aria-labelledby="study-career"><div className={styles.sectionHeading}><h2 id="study-career">Dos carreras.<br/>La misma escala.</h2></div><div className={styles.metricNames}>{players.map(p=><span key={p.name}>{p.name}</span>)}</div><div className={styles.metricRows}>{metrics.map(row=><div key={row.label}><strong data-lead={row.values[0]!==null&&row.values[1]!==null&&row.values[0]>row.values[1]||undefined}>{row.values[0]===null?'—':number(row.values[0],row.percent?1:0)+(row.percent?' %':'')}</strong><span>{row.label}</span><strong data-lead={row.values[0]!==null&&row.values[1]!==null&&row.values[1]>row.values[0]||undefined}>{row.values[1]===null?'—':number(row.values[1],row.percent?1:0)+(row.percent?' %':'')}</strong></div>)}</div></section>
 <section className={styles.surfaceSection} aria-labelledby="study-court"><div className={styles.sectionHeading}><h2 id="study-court">La pista cambia.<br/>El duelo también.</h2><div className={styles.surfaceTabs} role="group" aria-label="Superficie del duelo">{[['hard','Dura'],['clay','Tierra'],['grass','Hierba']].map(([id,label])=><button key={id} type="button" aria-pressed={surface===id} onClick={()=>setSurface(id)}>{label}</button>)}</div></div><div className={styles.surfaceScene} data-surface={surface}><div className={styles.courtFrame}><TennisCourt surface={surface} className={styles.court}/></div><div className={styles.surfaceResults}>{players.map((p,i)=>{const sample=p.surfaces.find(s=>s.surface===surface);return <article key={p.name} style={{'--player-tone':colors[i]} as CSSProperties}><h3><PlayerFlag code={p.country}/>{p.name}</h3><strong>{sample?.rate===null||!sample?'—':number(sample.rate,1)+' %'}</strong><span>de victorias</span><div className={styles.rateTrack} aria-hidden="true"><i style={{transform:'scaleX('+(sample?.rate||0)/100+')'}}/></div><p><b>{sample?.won||0}</b> victorias <span>·</span> <b>{(sample?.played||0)-(sample?.won||0)}</b> derrotas</p></article>})}</div></div></section>
 <section className={styles.evolution} aria-labelledby="study-evolution">
  <div className={styles.sectionHeading}><h2 id="study-evolution">Temporada a temporada.</h2><div className={styles.surfaceTabs} role="group" aria-label="Métrica anual"><button type="button" aria-pressed={metric==='wins'} onClick={()=>setMetric('wins')}>Victorias</button><button type="button" aria-pressed={metric==='rate'} onClick={()=>setMetric('rate')}>% de victorias</button></div></div>
  <div className={styles.legend}>{players.map((p,i)=><span key={p.name}><i style={{background:colors[i]}}/>{p.name}</span>)}</div>
  {years.length?<><div className={styles.plot} tabIndex={0} role="slider" aria-label="Año de la comparación" aria-valuemin={years[0]} aria-valuemax={years.at(-1)} aria-valuenow={selected} aria-valuetext={String(selected)}
   onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();setYear(years[e.key==='Home'?0:e.key==='End'?years.length-1:Math.max(0,Math.min(years.length-1,years.indexOf(selected!)+(e.key==='ArrowLeft'?-1:1)))])}}}
   onPointerMove={e=>{if(e.pointerType==='mouse'||e.currentTarget.hasPointerCapture(e.pointerId))selectYear(e)}} onPointerDown={e=>{if(e.pointerType!=='mouse')e.currentTarget.setPointerCapture(e.pointerId);selectYear(e)}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}}>
   <svg viewBox={`0 0 ${chartWidth} 250`} role="img" aria-labelledby={chartId}><title id={chartId}>{(metric==='wins'?'Victorias':'Porcentaje de victorias')+' por temporada de los dos jugadores'}</title>
    {players.map((p,i)=><path key={p.name} d={path(p)} stroke={colors[i]} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>)}
    {selected&&<path d={'M '+xs(selected)+' 20v195'} stroke="oklch(from #93a99a l c var(--appearance-hue,155.686))" strokeDasharray="3 6"/>}
    {players.map((p,i)=>{const row=p.years.find(r=>r.year===selected);return row&&<circle key={p.name} cx={xs(selected!)} cy={210-chartValue(row)/maximum*175} r="5" fill={colors[i]} stroke="white" strokeWidth="2"/>})}
    {[0,maximum/2,maximum].map(v=><text key={v} x="0" y={214-v/maximum*175} fill="oklch(from #52695c l c var(--appearance-hue,160.086))" fontSize={mobile?'12':'13'}>{String(v)+(metric==='rate'?'%':'')}</text>)}
    {[years[0],years[Math.floor((years.length-1)/2)],years.at(-1)].filter((v,i,a)=>a.indexOf(v)===i).map((y,i,a)=><text key={y} x={xs(y!)} y="243" textAnchor={i===0?'start':i===a.length-1?'end':'middle'} fill="oklch(from #52695c l c var(--appearance-hue,160.086))" fontSize="13">{y}</text>)}
   </svg>
  </div><div className={styles.yearReadout}><strong>{selected}</strong>{players.map((p,i)=>{const row=p.years.find(r=>r.year===selected);return <p key={p.name}><span>{p.name}</span><b style={{color:colors[i]}}>{!row?'—':metric==='wins'?number(row.wins):row.rate===null?'—':number(row.rate,1)+' %'}</b><small>{row?(metric==='wins'?'victorias · ':'')+number(row.played)+' partidos':'Sin partidos registrados'}</small></p>})}</div></>:<p className={styles.empty}>No hay temporadas con resultados en esta selección. Amplía el periodo o cambia los filtros.</p>}
 </section>
 <section className={styles.meetings} aria-labelledby="study-meetings"><div className={styles.sectionHeading}><h2 id="study-meetings">Frente a frente.</h2><p>{meetings.length} partidos del archivo</p></div>{evolution}{meetings.length?<><div className={styles.matchGrid}>{meetings.slice(0,showAll?undefined:6).map(m=><MatchScoreboard key={m.id} match={m}/>)}</div>{!showAll&&meetings.length>6&&<button className={styles.showAll} type="button" onClick={()=>setShowAll(true)}>Ver todos los partidos<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m-5-5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>}</>:<p>No hay enfrentamientos entre estos dos nombres en la selección actual.</p>}</section>
 </>;
}
