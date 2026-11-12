'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Scroll is sampled once per frame; server-rendered content stays visible. */
export function HomeMotion({children,className}:{children:ReactNode;className:string}){
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const element=root.current;
    const media=matchMedia('(min-width: 821px) and (prefers-reduced-motion: no-preference)');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    if(!element)return;
    let frame=0;
    const layers=Array.from(element.querySelectorAll<HTMLElement>('[data-home-depth]'));
    const update=()=>{
      frame=0;
      for(const layer of layers){
        const scene=layer.dataset.homeScene==='cinema';
        const mobilePhoto=layer.dataset.homeDepth==='65';
        if(!media.matches&&((!scene&&!mobilePhoto)||reduced.matches)){layer.style.removeProperty('--home-shift');layer.style.removeProperty('--home-progress');continue;}
        const rect=layer.getBoundingClientRect();
        if(rect.bottom<0||rect.top>innerHeight)continue;
        const progress=(rect.top+rect.height/2-innerHeight/2)/innerHeight;
        const depth=innerWidth<=821?Math.min(Number(layer.dataset.homeDepth)||30,28):Number(layer.dataset.homeDepth)||30;
        layer.style.setProperty('--home-shift',`${Math.max(-depth,Math.min(depth,-progress*depth)).toFixed(1)}px`);
        if(scene)layer.style.setProperty('--home-progress',Math.max(0,Math.min(1,(innerHeight-rect.top)/(innerHeight+rect.height))).toFixed(3));
      }
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};
    schedule();
    addEventListener('scroll',schedule,{passive:true});
    addEventListener('resize',schedule);
    media.addEventListener('change',schedule);
    reduced.addEventListener('change',schedule);
    return()=>{removeEventListener('scroll',schedule);removeEventListener('resize',schedule);media.removeEventListener('change',schedule);reduced.removeEventListener('change',schedule);if(frame)cancelAnimationFrame(frame);};
  },[]);
  return <div ref={root} className={className}>{children}</div>;
}
