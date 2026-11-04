'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/** A lightweight local film replaces the third-party player in the first viewport. */
export function HeroPlayback() {
  const container=useRef<HTMLDivElement>(null);
  const [deferred,setDeferred]=useState(false),[active,setActive]=useState(false),[ready,setReady]=useState(false);
  useEffect(()=>{
    const idleWindow=window as Window&{requestIdleCallback?:(callback:()=>void,options?:{timeout:number})=>number;cancelIdleCallback?:(id:number)=>void};
    let idle:number|undefined;
    const timer=window.setTimeout(()=>{
      if(idleWindow.requestIdleCallback)idle=idleWindow.requestIdleCallback(()=>setDeferred(true),{timeout:2_000});
      else setDeferred(true);
    },1_500);
    return()=>{window.clearTimeout(timer);if(idle!==undefined)idleWindow.cancelIdleCallback?.(idle);};
  },[]);
  useEffect(()=>{
    const node=container.current;if(!node)return;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const connection=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;
    let visible=false;
    const update=()=>{
      const allowed=deferred&&visible&&!document.hidden&&!motion.matches&&!connection?.saveData&&!/^(slow-)?2g$/.test(connection?.effectiveType||'');
      setActive(allowed);
    };
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();},{threshold:.05});
    observer.observe(node);motion.addEventListener('change',update);document.addEventListener('visibilitychange',update);update();
    return()=>{observer.disconnect();motion.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);};
  },[deferred]);
  return <div ref={container} className={`hero-video hero-film${ready?' is-ready':''}`}>
    <Image src="/videos/tennis-hero-poster.webp" alt="" fill sizes="100vw" aria-hidden="true" priority unoptimized/>
    {active&&<video autoPlay muted loop playsInline preload="metadata" poster="/videos/tennis-hero-poster.webp" onCanPlay={()=>setReady(true)} aria-hidden="true" tabIndex={-1}>
      <source src="/videos/tennis-hero-mobile.mp4" media="(max-width: 759px)" type="video/mp4"/>
      <source src="/videos/tennis-hero.mp4" type="video/mp4"/>
    </video>}
  </div>;
}
