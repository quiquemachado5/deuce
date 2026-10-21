"use client";
import {useEffect,useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
export type HomeHighlight={id:string;title:string;name:string;value:string;detail:string;sample:string;href:string;photo?:string;photoName?:string};
export default function HomeHighlights({slides}:{slides:HomeHighlight[]}) {
  const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[focused,setFocused]=useState(false),[hovered,setHovered]=useState(false);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(paused||focused||hovered||media.matches||slides.length<2)return;
    const timer=window.setInterval(()=>{if(!document.hidden)setIndex(old=>{const step=1+Math.floor(Math.random()*(slides.length-1));return(old+step)%slides.length;});},14000);
    return()=>window.clearInterval(timer);
  },[paused,focused,hovered,slides.length]);
  if(!slides.length)return null;
  const current=slides[index];
  return <section className="ds-highlight" aria-roledescription="carrusel" aria-label="Historias del archivo" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}>
    <div className="ds-highlight-slide" key={current.id}>
      <div className="ds-highlight-copy"><p className="ds-kicker">UN ARCHIVO. MILES DE HISTORIAS.</p><h2>{current.title}</h2><p className="ds-highlight-value">{current.value}</p><h3>{current.name}</h3><p className="ds-highlight-detail">{current.detail}</p><div className="ds-highlight-bottom"><Link className="ds-white-button" href={current.href}>Descubrir el dato <span aria-hidden="true">↗</span></Link><span>{current.sample}</span></div></div>
      {current.photo?<div className="ds-highlight-image"><Image src={current.photo} alt={current.photoName||current.name} fill sizes="(max-width:759px) 100vw, 50vw" unoptimized priority={index===0}/></div>:<div className="ds-highlight-art" aria-hidden="true"><span>DEUCE</span><i/><i/><i/></div>}
    </div>
    <div className="ds-highlight-controls"><span>{String(index+1).padStart(2,'0')} / {String(slides.length).padStart(2,'0')}</span><div>{slides.map((slide,i)=><button key={slide.id} type="button" aria-label={`Mostrar: ${slide.title}`} aria-pressed={i===index} onClick={()=>{setIndex(i);setPaused(true);}}><span/></button>)}</div><button type="button" className="ds-rotation-toggle" onClick={()=>setPaused(!paused)} aria-label={paused?'Reanudar destacados':'Pausar destacados'}>{paused?'Reproducir':'Pausar'} <span aria-hidden="true">{paused?'▷':'Ⅱ'}</span></button></div>
  </section>;
}
