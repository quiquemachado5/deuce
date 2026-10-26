'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from 'lucide-react';
import type { TournamentSlide } from '@/types/deuce';
export function TournamentSlider({ slides }: { slides:TournamentSlide[] }) {
  const [active,setActive]=useState(0),[paused,setPaused]=useState(false),[hovered,setHovered]=useState(false);
  const section=useRef<HTMLElement>(null),pointer=useRef<number|null>(null);
  useEffect(()=>{
    if(slides.length<2||paused||hovered)return;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');let visible=false;let timer:ReturnType<typeof setInterval>|undefined;
    const update=()=>{clearInterval(timer);if(!motion.matches&&visible&&!document.hidden)timer=setInterval(()=>setActive(current=>(current+1)%slides.length),5200);};
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();},{threshold:.2});
    if(section.current)observer.observe(section.current);
    motion.addEventListener('change',update);document.addEventListener('visibilitychange',update);
    return()=>{clearInterval(timer);observer.disconnect();motion.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);};
  },[slides.length,paused,hovered]);
  if(!slides.length)return null;
  const move=(step:number)=>{setActive(current=>(current+step+slides.length)%slides.length);};
  return <section ref={section} className="tournament-band slider-band" aria-label="Grandes escenarios" aria-roledescription="carrusel" onPointerEnter={event=>{if(event.pointerType==='mouse')setHovered(true);}} onPointerLeave={()=>setHovered(false)} onFocusCapture={()=>setPaused(true)}>
    <div className="slider-title"><h2>Grandes escenarios</h2><p>Cuatro torneos que forman parte de la historia del tenis.</p></div>
    <div className="archive-slider" onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();move(1);}if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}}}>
      <div className="slider-window" onPointerDown={event=>{pointer.current=event.clientX;}} onPointerUp={event=>{if(pointer.current!==null&&Math.abs(event.clientX-pointer.current)>45)move(event.clientX<pointer.current?1:-1);pointer.current=null;}} onPointerCancel={()=>{pointer.current=null;}}>
        <div className="slider-track" style={{transform:`translateX(-${active*100}%)`}}>{slides.map((slide,index)=><article className={`archive-slide${index===active?' active':''}`} key={slide.id} aria-hidden={index!==active}>
          <Image src={slide.image} alt={slide.alt} fill sizes="90vw"/><div className="slide-copy"><h3><Link href={slide.href} tabIndex={index===active?0:-1}>{slide.name}</Link></h3><p>{slide.description}</p></div>
        </article>)}</div>
      </div>
      <button className="slider-mobile-pause" type="button" onClick={()=>setPaused(value=>!value)}>{paused?'Activar rotación automática':'Pausar rotación automática'}</button>
      <div className="slider-ui"><button type="button" onClick={()=>move(-1)} aria-label="Torneo anterior"><ArrowLeft size={20} aria-hidden="true"/></button><button type="button" onClick={()=>move(1)} aria-label="Torneo siguiente"><ArrowRight size={20} aria-hidden="true"/></button><span className="slider-count" aria-live={paused?'polite':'off'}>{String(active+1).padStart(2,'0')} / {String(slides.length).padStart(2,'0')}</span><button className="slider-pause" type="button" onClick={()=>setPaused(value=>!value)} aria-label={paused?'Activar rotación automática':'Pausar rotación automática'}>{paused?<Play size={18} aria-hidden="true"/>:<Pause size={18} aria-hidden="true"/>}</button><div className="slider-progress" aria-hidden="true"><i style={{width:`${100/slides.length}%`,transform:`scaleX(${active+1})`}}/></div><Link className="slider-link" href="/tournaments">Explorar torneos <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
    </div>
  </section>;
}
