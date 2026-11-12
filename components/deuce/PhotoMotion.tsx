'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
/** Only explicitly selected editorial photographs move; content and controls remain still. */
export function PhotoMotion(){
 const pathname=usePathname();
 useEffect(()=>{
  const media=matchMedia('(min-width:821px) and (prefers-reduced-motion:no-preference)');
  let frame=0;const active=new Set<HTMLElement>();
  const images=Array.from(document.querySelectorAll<HTMLElement>('[data-photo-motion]'));
  const update=()=>{frame=0;for(const image of active){if(!media.matches){image.style.removeProperty('--photo-drift');continue;}const rect=image.getBoundingClientRect();const offset=Math.max(-14,Math.min(14,(innerHeight/2-rect.top-rect.height/2)*.035));image.style.setProperty('--photo-drift',offset.toFixed(1)+'px')}};
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){const image=entry.target as HTMLElement;if(entry.isIntersecting)active.add(image);else active.delete(image)}schedule()},{rootMargin:'40px'});
  images.forEach(image=>observer.observe(image));addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);media.addEventListener('change',schedule);
  return()=>{observer.disconnect();removeEventListener('scroll',schedule);removeEventListener('resize',schedule);media.removeEventListener('change',schedule);if(frame)cancelAnimationFrame(frame);images.forEach(image=>image.style.removeProperty('--photo-drift'))};
 },[pathname]);return null;
}
