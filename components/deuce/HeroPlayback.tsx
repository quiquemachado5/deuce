'use client';
import { useEffect, useRef } from 'react';
/** No controls in the hero. Motion preference, visibility and data saving govern playback. */
export function HeroPlayback() {
  const video=useRef<HTMLVideoElement>(null);
  useEffect(()=>{
    const node=video.current;if(!node)return;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const connection=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;
    let visible=false;
    const update=()=>{
      const allowed=visible&&!document.hidden&&!motion.matches&&!connection?.saveData&&!/^(slow-)?2g$/.test(connection?.effectiveType||'');
      if(allowed){if(!node.getAttribute('src'))node.src=node.canPlayType('video/mp4')?'/videos/tennis-hero.mp4':'/videos/tennis-hero.webm';void node.play().catch(()=>{});}else node.pause();
    };
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();},{threshold:.05});
    observer.observe(node);motion.addEventListener('change',update);document.addEventListener('visibilitychange',update);update();
    return()=>{observer.disconnect();motion.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);node.pause();};
  },[]);
  return <video ref={video} className="hero-video" muted loop playsInline preload="none" poster="/videos/tennis-hero-poster.webp" aria-label="Jugadores disputando un partido en una pista azul al aire libre"/>;
}
