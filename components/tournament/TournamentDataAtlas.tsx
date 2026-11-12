'use client';

import {useState,type CSSProperties} from 'react';
import styles from './tournament-experience.module.css';
type PressureDatum={label:string;count:number;rate:number};
const number=(value:number,digits=0)=>value.toLocaleString('es-ES',{maximumFractionDigits:digits});
/** Only compact, computed facts cross the client boundary, never the match archive. */
export function TournamentDataAtlas({decades=[],pressure,rhythm}:{decades?:[number,number][];pressure:PressureDatum[];rhythm:{label:string;value:string}[]}){
  const [tab,setTab]=useState(decades.length?'history':'pressure');
  const [selected,setSelected]=useState(0);
  const focus=pressure[Math.min(selected,pressure.length-1)];
  const ceiling=Math.max(1,...decades.map(([,count])=>count));
  const tabs=[...(decades.length?[{id:'history',label:'Historia'}]:[]),{id:'pressure',label:'Presión'},{id:'rhythm',label:'Ritmo'}];
  return <div className={styles.atlas}><div className={styles.atlasTabs} role="group" aria-label="Explorar los datos del torneo">{tabs.map(item=><button key={item.id} type="button" aria-pressed={tab===item.id} onClick={()=>setTab(item.id)}>{item.label}</button>)}</div>
    {tab==='history'&&<div className={styles.atlasHistory}><div className={styles.atlasHeading}><h3>Partidos por década</h3><span>Resultados terminados</span></div><div className={styles.atlasBars}>{decades.map(([decade,count])=><div key={decade}><strong>{number(count)}</strong><span style={{'--bar-height':`${Math.max(2,count/ceiling*100)}%`} as CSSProperties}/><small>{decade}</small></div>)}</div></div>}
    {tab==='pressure'&&focus&&<div className={styles.atlasPressure}><div className={styles.atlasChoices}><h3>Partidos bajo presión</h3>{pressure.map((row,index)=><button type="button" key={row.label} aria-pressed={index===selected} onClick={()=>setSelected(index)}><span>{row.label}</span><strong>{number(row.rate,1)} %</strong></button>)}</div><div className={styles.atlasFocus} aria-live="polite"><strong>{number(focus.count)}</strong><h4>{focus.label}</h4><div className={styles.pressureScale} aria-hidden="true">{Array.from({length:40},(_,index)=><i key={index} data-filled={index/40<focus.rate/100||undefined}/>)}</div><span>{number(focus.rate,1)} % de los partidos</span></div></div>}
    {tab==='rhythm'&&<div className={styles.atlasRhythm}><h3>El ritmo del juego</h3><dl>{rhythm.map(row=><div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></div>}
  </div>;
}
