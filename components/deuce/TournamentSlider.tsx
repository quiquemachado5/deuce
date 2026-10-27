"use client";

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TournamentSlide } from '@/types/deuce';
import { imageFocus } from '@/lib/image-focus';

const AUTOPLAY_DELAY = 4800;

export function TournamentSlider({ slides }: { slides:TournamentSlide[] }) {
  const trackRef=useRef<HTMLDivElement>(null);
  const directionRef=useRef<1|-1>(1);
  const scrollFrameRef=useRef<number>();
  const [current,setCurrent]=useState(0);
  const [manualPaused,setManualPaused]=useState(false);
  const [focusPaused,setFocusPaused]=useState(false);
  const [reducedMotion,setReducedMotion]=useState(false);

  const scrollToSlide=useCallback((index:number,behavior:ScrollBehavior='smooth')=>{
    const track=trackRef.current;
    const item=track?.children.item(index) as HTMLElement|null;
    const first=track?.children.item(0) as HTMLElement|null;
    if(!track||!item||!first)return;
    track.scrollTo({left:item.offsetLeft-first.offsetLeft,behavior});
  },[]);

  const moveTo=useCallback((index:number)=>{
    const safeIndex=Math.max(0,Math.min(slides.length-1,index));
    setCurrent(safeIndex);
    scrollToSlide(safeIndex,reducedMotion?'auto':'smooth');
  },[reducedMotion,scrollToSlide,slides.length]);

  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReducedMotion(media.matches);
    update();
    media.addEventListener('change',update);
    return()=>media.removeEventListener('change',update);
  },[]);

  useEffect(()=>{
    if(manualPaused||focusPaused||reducedMotion||slides.length<2)return;
    const timer=window.setInterval(()=>{
      setCurrent(previous=>{
        let next=previous+directionRef.current;
        if(next>=slides.length){directionRef.current=-1;next=previous-1;}
        if(next<0){directionRef.current=1;next=previous+1;}
        window.requestAnimationFrame(()=>scrollToSlide(next,'smooth'));
        return next;
      });
    },AUTOPLAY_DELAY);
    return()=>window.clearInterval(timer);
  },[focusPaused,manualPaused,reducedMotion,scrollToSlide,slides.length]);

  useEffect(()=>()=>{
    if(scrollFrameRef.current)window.cancelAnimationFrame(scrollFrameRef.current);
  },[]);

  const syncCurrent=()=>{
    if(scrollFrameRef.current)window.cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current=window.requestAnimationFrame(()=>{
      const track=trackRef.current;
      const items=track?Array.from(track.children) as HTMLElement[]:[];
      if(!track||!items.length)return;
      const firstOffset=items[0].offsetLeft;
      const closest=items.reduce((best,item,index)=>Math.abs(item.offsetLeft-firstOffset-track.scrollLeft)<best.distance?{index,distance:Math.abs(item.offsetLeft-firstOffset-track.scrollLeft)}:best,{index:0,distance:Number.POSITIVE_INFINITY});
      if(closest.index!==current){
        directionRef.current=closest.index>current?1:-1;
        setCurrent(closest.index);
      }
    });
  };

  const handleKeys=(event:React.KeyboardEvent<HTMLDivElement>)=>{
    if(event.key==='ArrowRight'){
      event.preventDefault();
      directionRef.current=1;
      moveTo(current+1);
    }
    if(event.key==='ArrowLeft'){
      event.preventDefault();
      directionRef.current=-1;
      moveTo(current-1);
    }
  };

  if(!slides.length)return null;
  return <section className="tournament-band tournament-static tournament-carousel" aria-labelledby="grand-venues-title" data-current={current+1}>
    <div className="section-head light"><h2 id="grand-venues-title">Grandes escenarios</h2><div className="tournament-carousel-actions"><Link className="deuce-cta" href="/torneos">Ver torneos <ArrowUpRight size={18} aria-hidden="true"/></Link><span className="tournament-carousel-position" aria-hidden="true">{String(current+1).padStart(2,'0')} / {String(slides.length).padStart(2,'0')}</span><button className="tournament-carousel-toggle" type="button" onClick={()=>setManualPaused(value=>!value)} aria-label={manualPaused?'Reanudar carrusel automático':'Pausar carrusel automático'} aria-pressed={manualPaused}>{manualPaused?<Play size={16} fill="currentColor" aria-hidden="true"/>:<Pause size={16} fill="currentColor" aria-hidden="true"/>}</button></div></div>
    <div ref={trackRef} className="tournament-static-grid" role="list" aria-label="Grand Slams y Masters 1000" tabIndex={0} onScroll={syncCurrent} onKeyDown={handleKeys} onFocusCapture={()=>setFocusPaused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocusPaused(false);}}>{slides.map((slide,index)=><article className="archive-slide active" role="listitem" aria-current={current===index?'true':undefined} key={slide.id}>
      <Image className="art-directed-photo" src={slide.image} alt={slide.alt} fill sizes="(max-width:759px) 84vw, 31vw" priority={index<2} style={imageFocus(slide.imagePosition||'center',slide.imagePositionMobile||slide.imagePosition||'center')}/><div className="slide-copy"><h3><Link href={slide.href}>{slide.name}</Link></h3></div>
    </article>)}</div>
  </section>;
}
