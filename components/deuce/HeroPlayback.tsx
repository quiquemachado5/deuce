'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const VIDEO_ID='q3wrcFIrwD4';
const PLAYER_ORIGIN='https://www.youtube-nocookie.com';
const VIDEO_SRC=`${PLAYER_ORIGIN}/embed/${VIDEO_ID}?autoplay=1&mute=1&controls=0&disablekb=1&loop=1&playlist=${VIDEO_ID}&playsinline=1&rel=0&iv_load_policy=3&cc_load_policy=0&start=12&end=72&enablejsapi=1`;

/** Official match footage is requested only after the poster has painted. */
export function HeroPlayback() {
  const container=useRef<HTMLDivElement>(null);
  const player=useRef<HTMLIFrameElement>(null);
  const [deferred,setDeferred]=useState(false),[active,setActive]=useState(false),[ready,setReady]=useState(false);
  const listenToPlayer=useCallback(()=>{
    player.current?.contentWindow?.postMessage(JSON.stringify({event:'listening',id:'deuce-hero'}),PLAYER_ORIGIN);
  },[]);
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
      if(!allowed)setReady(false);
      setActive(allowed);
    };
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();},{threshold:.05});
    observer.observe(node);motion.addEventListener('change',update);document.addEventListener('visibilitychange',update);update();
    return()=>{observer.disconnect();motion.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);};
  },[deferred]);
  useEffect(()=>{
    if(!active)return;
    const onMessage=(event:MessageEvent)=>{
      if(event.origin!==PLAYER_ORIGIN||event.source!==player.current?.contentWindow)return;
      try{
        const payload=typeof event.data==='string'?JSON.parse(event.data):event.data;
        if(payload?.event==='onReady'||(payload?.event==='infoDelivery'&&payload?.info?.playerState===1))setReady(true);
      }catch{/* Ignore unrelated third-party messages. */}
    };
    window.addEventListener('message',onMessage);
    const ping=window.setInterval(listenToPlayer,500);
    return()=>{window.clearInterval(ping);window.removeEventListener('message',onMessage);};
  },[active,listenToPlayer]);
  return <div ref={container} className={`hero-video hero-film${ready?' is-ready':''}`}>
    <Image src="/videos/tennis-hero-poster.webp?v=2" alt="" fill sizes="100vw" aria-hidden="true" priority unoptimized/>
    {active&&<iframe ref={player} src={VIDEO_SRC} title="Mejores puntos oficiales del US Open 2026" allow="autoplay; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" onLoad={listenToPlayer} aria-hidden="true" tabIndex={-1}/>}
  </div>;
}
