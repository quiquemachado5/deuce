'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useCallback,useEffect,useLayoutEffect,useRef} from 'react';
import {ArrowUpRight} from 'lucide-react';
import type {TournamentSlide} from '@/types/deuce';
import {imageFocus} from '@/lib/image-focus';
import styles from '@/app/home-editorial.module.css';

/** Identical runs make Paris followed by Australia without a visible rewind. */
export function HomeVenues({slides}:{slides:TournamentSlide[]}){
  const track=useRef<HTMLDivElement>(null),position=useRef(slides.length);
  const paused=useRef(false),pauseUntil=useRef(0),resetting=useRef(false);
  const scrollTo=useCallback((index:number,behavior:ScrollBehavior)=>{
    const node=track.current,item=node?.children[index] as HTMLElement|undefined,first=node?.children[0] as HTMLElement|undefined;
    if(node&&item&&first)node.scrollTo({left:item.offsetLeft-first.offsetLeft,behavior});
  },[]);
  useLayoutEffect(()=>{position.current=slides.length;scrollTo(slides.length,'instant');},[slides.length,scrollTo]);
  const move=useCallback((direction:number)=>{if(!slides.length)return;position.current+=direction;scrollTo(position.current,matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth');},[slides.length,scrollTo]);
  useEffect(()=>{
    const node=track.current;if(!node||slides.length<2)return;
    let settled:ReturnType<typeof setTimeout>;
    const settle=()=>{clearTimeout(settled);settled=setTimeout(()=>{
      if(resetting.current)return;
      const cards=Array.from(node.children) as HTMLElement[],origin=cards[0].offsetLeft;
      const closest=cards.reduce((best,card,index)=>Math.abs(card.offsetLeft-origin-node.scrollLeft)<Math.abs(cards[best].offsetLeft-origin-node.scrollLeft)?index:best,0);
      position.current=closest;
      if(closest<slides.length||closest>=slides.length*2){resetting.current=true;const middle=slides.length+closest%slides.length;position.current=middle;scrollTo(middle,'instant');requestAnimationFrame(()=>{resetting.current=false;});}
    },180);};
    node.addEventListener('scroll',settle,{passive:true});
    const timer=setInterval(()=>{if(!document.hidden&&!paused.current&&Date.now()>pauseUntil.current&&!matchMedia('(prefers-reduced-motion: reduce)').matches)move(1);},4800);
    return()=>{clearInterval(timer);clearTimeout(settled);node.removeEventListener('scroll',settle);};
  },[move,scrollTo,slides.length]);
  if(!slides.length)return null;
  return <section className={styles.venues} aria-labelledby="grand-venues-title"><div className={styles.venueHead}><h2 id="grand-venues-title">Grandes escenarios.</h2><Link href="/torneos" aria-label="Ver todos los torneos"><ArrowUpRight size={23}/></Link></div><div className={styles.venueTrack} ref={track} role="region" aria-label="Grand Slams y Masters 1000" tabIndex={0} onMouseEnter={()=>{paused.current=true;}} onMouseLeave={()=>{paused.current=false;}} onFocusCapture={()=>{paused.current=true;}} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))paused.current=false;}} onPointerDown={()=>{pauseUntil.current=Date.now()+9000;}} onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?-1:1);}}}>{[0,1,2].flatMap(run=>slides.map(slide=><Link className={styles.venueCard} href={slide.href} key={run+'-'+slide.id} aria-hidden={run!==1||undefined} tabIndex={run===1?0:-1} data-loop-slide={slide.id} data-loop-run={run}><Image className="art-directed-photo" src={slide.image} alt={run===1?slide.alt:''} fill sizes="(max-width:759px) 83vw, 740px" quality={88} style={imageFocus(slide.imagePosition||'center',slide.imagePositionMobile||slide.imagePosition||'center')}/><span/><h3>{slide.name}</h3></Link>))}</div></section>;
}
