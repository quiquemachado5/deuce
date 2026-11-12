'use client';
import Link from 'next/link';
import {useEffect,useId,useRef,useState,useSyncExternalStore} from 'react';
import {ArrowUpRight,Pause,Play} from 'lucide-react';
import type {MatchRecord} from '@/types/deuce';
import styles from './head-to-head-evolution.module.css';
export type BalancePoint={match:MatchRecord;wins:[number,number]};
const query='(prefers-reduced-motion: reduce)';
const subscribe=(notify:()=>void)=>{const m=matchMedia(query);m.addEventListener('change',notify);return()=>m.removeEventListener('change',notify)};
export function HeadToHeadEvolution({points,names}:{points:BalancePoint[];names:string[]}){
 const[index,setIndex]=useState(0),[paused,setPaused]=useState(false),[hover,setHover]=useState(false),[visible,setVisible]=useState(false);
 const id=useId(),root=useRef<HTMLElement>(null),rail=useRef<HTMLDivElement>(null);
 const reduced=useSyncExternalStore(subscribe,()=>matchMedia(query).matches,()=>false);
 useEffect(()=>{const el=root.current;if(!el)return;const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.3});observer.observe(el);return()=>observer.disconnect()},[]);
 useEffect(()=>{if(paused||hover||reduced||!visible||points.length<2)return;const timer=setInterval(()=>{if(!document.hidden)setIndex(i=>i>=points.length-1?0:i+1)},3000);return()=>clearInterval(timer)},[paused,hover,reduced,visible,points.length]);
 useEffect(()=>{const el=rail.current,button=el?.children[index] as HTMLElement|undefined;if(el&&button)el.scrollTo({left:button.offsetLeft-el.offsetLeft-el.clientWidth/2+button.clientWidth/2,behavior:reduced?'instant':'smooth'})},[index,reduced]);
 if(points.length<2)return null;
 const point=points[Math.min(index,points.length-1)];
 return <section ref={root} className={styles.timelineSection} aria-labelledby={id} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setHover(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setHover(false)}}>
  <div className={styles.timeline}>
   <header><h3 id={id}>Cómo cambió el duelo.</h3></header>
   <div className={styles.timelineReading} data-surface={point.match.surface}>
    <div className={styles.meetingContext}><span>{point.match.year}</span><h4>{point.match.tournament}</h4><p>{point.match.round.replace(/^Semifinales$/i,'Semifinal')}</p></div>
    <div className={styles.timelineBalance} aria-label="Balance acumulado hasta este encuentro">{names.map((name,i)=><div key={name}><span>{name}</span><strong data-lead={point.wins[i]>point.wins[1-i]||undefined}>{point.wins[i]}</strong></div>)}</div>
    <Link href={point.match.href}>Ver partido <ArrowUpRight size={16}/></Link>
   </div>
   <div ref={rail} className={styles.timelineRail} role="group" aria-label="Encuentros en orden cronológico">{points.map((p,i)=><button key={p.match.id} type="button" aria-pressed={index===i} aria-label={`${p.match.year}, ${p.match.tournament}: ${p.wins.join(' a ')}`} data-side={p.wins[0]>(points[i-1]?.wins[0]||0)?'first':'second'} onClick={()=>{setPaused(true);setIndex(i)}}><span>{p.match.year}</span><i/><small>{p.match.tournament}</small></button>)}</div>
  </div>
  {!reduced&&<div className={styles.playbackFooter}><button type="button" className={styles.playback} onClick={()=>setPaused(v=>!v)} aria-label={paused?'Reproducir la historia del duelo':'Pausar la historia del duelo'}>{paused?<Play size={15}/>:<Pause size={15}/>}</button></div>}
 </section>;
}
