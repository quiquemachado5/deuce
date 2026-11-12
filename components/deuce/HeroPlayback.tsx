'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/** Local, silent promotional film. No embedded player UI or broadcast graphics. */
export function HeroPlayback() {
  const container=useRef<HTMLDivElement>(null);
  const [active,setActive]=useState(false),[ready,setReady]=useState(false);
  useEffect(()=>{
    const node=container.current;if(!node)return;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const connection=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;
    let visible=false,deferred=false;
    const update=()=>{
      const allowed=deferred&&visible&&!document.hidden&&!motion.matches&&!connection?.saveData&&!/^(slow-)?2g$/.test(connection?.effectiveType||'');
      if(!allowed)setReady(false);
      setActive(allowed);
    };
    const timer=setTimeout(()=>{deferred=true;update()},900);
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update()},{threshold:.05});
    observer.observe(node);
    motion.addEventListener('change',update);document.addEventListener('visibilitychange',update);
    return()=>{clearTimeout(timer);observer.disconnect();motion.removeEventListener('change',update);document.removeEventListener('visibilitychange',update)};
  },[]);
  return <div ref={container} className={`hero-video hero-film${ready?' is-ready':''}`}>
    <Image src="/videos/deuce-professional-poster.webp" alt="" fill sizes="100vw" aria-hidden="true" priority unoptimized/>
    {active&&<video src="/videos/deuce-professional.mp4" autoPlay muted loop playsInline controls={false} disablePictureInPicture disableRemotePlayback controlsList="nodownload nofullscreen noremoteplayback" preload="metadata" onPlaying={()=>setReady(true)} onError={()=>setReady(false)} aria-hidden="true" tabIndex={-1}/>}
  </div>;
}
