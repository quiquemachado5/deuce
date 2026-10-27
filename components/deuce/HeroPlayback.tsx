'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const segments = [
  { start: 1210, end: 1270 },
  { start: 1640, end: 1700 },
  { start: 2048, end: 2108 },
  { start: 2865, end: 2925 },
] as const;

/** The official privacy-enhanced player joins four one-minute editorial excerpts. */
export function HeroPlayback() {
  const container=useRef<HTMLDivElement>(null);
  const [active,setActive]=useState(false),[segment,setSegment]=useState(0);
  useEffect(()=>{
    const node=container.current;if(!node)return;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const connection=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;
    let visible=false;
    const update=()=>{
      const allowed=visible&&!document.hidden&&!motion.matches&&!connection?.saveData&&!/^(slow-)?2g$/.test(connection?.effectiveType||'');
      setActive(allowed);
    };
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();},{threshold:.05});
    observer.observe(node);motion.addEventListener('change',update);document.addEventListener('visibilitychange',update);update();
    return()=>{observer.disconnect();motion.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);};
  },[]);
  useEffect(()=>{
    if(!active)return;
    const timer=window.setTimeout(()=>setSegment(value=>(value+1)%segments.length),(segments[segment].end-segments[segment].start)*1000);
    return()=>window.clearTimeout(timer);
  },[active,segment]);
  const current=segments[segment];
  return <div ref={container} className="hero-video hero-youtube" aria-label="Selección editorial de grandes puntos de la temporada 2025">
    <Image src="/videos/tennis-hero-poster.webp" alt="" fill sizes="100vw" aria-hidden="true" priority unoptimized/>
    {active&&<iframe key={segment} src={`https://www.youtube-nocookie.com/embed/N34Ac5H0NMk?autoplay=1&mute=1&controls=0&disablekb=1&playsinline=1&rel=0&modestbranding=1&cc_load_policy=0&iv_load_policy=3&fs=0&showinfo=0&start=${current.start}&end=${current.end}`} title="Grandes puntos del circuito ATP 2025" allow="autoplay; encrypted-media" tabIndex={-1}/>}
  </div>;
}
