'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './records-experience.module.css';

type LeaderSet={id:string;title:string;label:string;href:string;rows:{name:string;href:string;value:string;place:number}[]};

export function RecordLeaders({sets}:{sets:LeaderSet[]}){
  const [selected,setSelected]=useState(sets[0].id);
  const current=sets.find(set=>set.id===selected)||sets[0];
  return <div className={styles.leaderBoard}>
    <div className={styles.leaderTabs} aria-label="Elegir clasificación">{sets.map(set=><button key={set.id} type="button" aria-pressed={set.id===current.id} onClick={()=>setSelected(set.id)}>{set.label}</button>)}</div>
    <h3>{current.title}</h3>
    <ol className={styles.ranking} aria-label={current.title}>{current.rows.map(row=><li key={`${row.href}-${row.name}`}><Link href={row.href}><span>{row.place}</span><strong>{row.name}</strong><b>{row.value}</b></Link></li>)}</ol>
    <Link className={styles.rankingMore} href={current.href}>Clasificación completa<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></Link>
  </div>;
}

export function RecordsFilm(){
  const root=useRef<HTMLVideoElement>(null);
  const [active,setActive]=useState(false);
  useEffect(()=>{
    const video=root.current;if(!video)return;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.some(entry=>entry.isIntersecting);
      if(visible&&!motion.matches){setActive(true);void video.play().catch(()=>{});}else video.pause();
    },{rootMargin:'120px'});
    observer.observe(video);
    const pause=()=>{if(motion.matches)video.pause();};
    motion.addEventListener('change',pause);
    return()=>{observer.disconnect();motion.removeEventListener('change',pause);video.pause();};
  },[]);
  useEffect(()=>{if(active)void root.current?.play().catch(()=>{});},[active]);
  return <video ref={root} src={active?'/videos/deuce-promo.mp4':undefined} poster="/videos/deuce-promo-poster.webp" preload="none" muted loop playsInline controls={false} aria-hidden="true" tabIndex={-1}/>;
}
