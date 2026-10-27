"use client";

import { ArrowUpRight, Pause, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { imageFocus } from '@/lib/image-focus';

export type OnThisDayStory={
  id:string;
  year:number;
  date:string;
  context:string;
  winner:string;
  loser:string;
  score:string;
  photo?:{src:string;thumbnail?:string;alt:string;objectPosition?:string;mobileObjectPosition?:string};
};

const AUTOPLAY_DELAY=6000;

export function OnThisDayCarousel({ stories }: { stories:OnThisDayStory[] }) {
  const [current,setCurrent]=useState(0);
  const [paused,setPaused]=useState(false);
  const [reducedMotion,setReducedMotion]=useState(false);

  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReducedMotion(media.matches);
    update();
    media.addEventListener('change',update);
    return()=>media.removeEventListener('change',update);
  },[]);

  useEffect(()=>{
    if(paused||reducedMotion||stories.length<2)return;
    const timer=window.setInterval(()=>setCurrent(index=>(index+1)%stories.length),AUTOPLAY_DELAY);
    return()=>window.clearInterval(timer);
  },[paused,reducedMotion,stories.length]);

  if(!stories.length)return null;
  const active=stories[Math.min(current,stories.length-1)];
  const photo=active.photo;
  return <section className="home-section legacy-daily" aria-labelledby="on-this-day-title">
    <div className="legacy-daily-head"><h2 id="on-this-day-title">Tal día como hoy</h2><div className="legacy-daily-controls"><time>{active.date}</time><span aria-hidden="true">{String(current+1).padStart(2,'0')} / {String(stories.length).padStart(2,'0')}</span>{stories.length>1&&<button type="button" onClick={()=>setPaused(value=>!value)} aria-label={paused?'Reanudar historias':'Pausar historias'} aria-pressed={paused}>{paused?<Play size={15} fill="currentColor" aria-hidden="true"/>:<Pause size={15} fill="currentColor" aria-hidden="true"/>}</button>}</div></div>
    <article className={`legacy-daily-card${photo?'':' without-photo'}`} key={active.id}>{photo&&<div className="legacy-daily-photo"><Image className="art-directed-photo" unoptimized src={photo.src} alt={photo.alt} fill sizes="(max-width:800px) 94vw, 90vw" style={imageFocus(photo.objectPosition||'center top',photo.mobileObjectPosition||photo.objectPosition||'center top')}/></div>}<span className="legacy-daily-shade" aria-hidden="true"/><div className="legacy-daily-copy">
      <span className="legacy-daily-year">{active.year}</span><span className="legacy-daily-context">{active.context}</span><h3>{active.winner} venció a {active.loser}</h3>
      <p className="legacy-daily-score">{active.score}</p><Link href={`/match/${active.id}`}>Ver partido <ArrowUpRight size={19} aria-hidden="true"/></Link>
    </div></article>
    {stories.length>1&&<div className="legacy-daily-archive" aria-label="Partidos de otras décadas">{stories.map((item,index)=><button type="button" aria-pressed={current===index} onClick={()=>setCurrent(index)} key={item.id}>{item.photo&&<span className="legacy-daily-archive-photo"><Image className="art-directed-photo" unoptimized src={item.photo.thumbnail||item.photo.src} alt="" fill sizes="(max-width:759px) 40vw, 16vw" style={imageFocus(item.photo.objectPosition||'center top',item.photo.mobileObjectPosition||item.photo.objectPosition||'center top')}/></span>}<span className="legacy-daily-archive-shade" aria-hidden="true"/><span className="legacy-daily-archive-copy"><strong>{item.year}</strong><span>{item.winner}</span></span></button>)}</div>}
  </section>;
}
