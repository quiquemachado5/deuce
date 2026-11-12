'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {TennisCourt} from './TennisCourt';
import PlayerFlag from '@/components/PlayerFlag';
import {imageFocus} from '@/lib/image-focus';
import styles from './on-this-day-feature.module.css';
type StoryPhoto={src:string;alt:string;objectPosition?:string;mobileObjectPosition?:string};
export type OnThisDayStory={id:string;year:number;date:string;kind?:'match'|'title'|'event';context:string;headline:string;detail:string;source?:{name:string;href:string};photo?:StoryPhoto;surface?:string;score?:string;players?:{name:string;won:boolean;country?:string;sets?:number[];photo?:StoryPhoto}[]};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const dateLabel=(date:string)=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
function StoryAction({story}:{story:OnThisDayStory}){return <Link href={story.source?.href||'/match/'+story.id} className={styles.open}><span>{story.source?'Leer la historia':story.kind==='title'?'Así ganó el título':'Revive el partido'}</span><ArrowUpRight size={18} aria-hidden="true"/></Link>}
function StoryVisual({story}:{story:OnThisDayStory}){
 return story.players?<div className={styles.matchScene} data-surface={story.surface}>
  <div className={styles.courtWide}><TennisCourt horizontal surface={story.surface} className={styles.court}/></div><div className={styles.courtTall}><TennisCourt surface={story.surface} className={styles.court}/></div>
  <div className={styles.courtPlayers}>{story.players.map(player=><div className={styles.player} key={player.name} data-winner={player.won||undefined}>
   <div className={styles.mobileFlag}><PlayerFlag code={player.country}/></div><div className={styles.portrait}>{player.photo?<Image src={player.photo.src} alt={player.photo.alt} fill sizes="(max-width:759px) 54px, 76px" style={imageFocus(player.photo.objectPosition||'center',player.photo.mobileObjectPosition||player.photo.objectPosition||'center')}/>:<PlayerFlag code={player.country}/>}</div>
   <span title={player.name}><PlayerFlag code={player.country}/>{player.name}</span>
  </div>)}</div>{story.score&&<span className={styles.courtScore}>{story.score}</span>}
 </div>:story.photo?<figure className={styles.photo}><Image src={story.photo.src} alt={story.photo.alt} fill sizes="(max-width:759px) 50vw, 550px" style={imageFocus(story.photo.objectPosition||'center',story.photo.mobileObjectPosition||story.photo.objectPosition||'center')}/></figure>:<TennisCourt className={styles.court}/>;
}
/** Desktop is editorial and static. Only mobile authors a native-scroll narrative. */
export function OnThisDayFeature({stories}:{stories:[OnThisDayStory,...OnThisDayStory[]]}){
 const sequence=useRef<HTMLDivElement>(null),[index,setIndex]=useState(0);
 useEffect(()=>{
  const section=sequence.current;if(!section)return;
  const mobile=matchMedia('(max-width:759px)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,visible=false;
  const update=()=>{
   frame=0;const enabled=mobile.matches&&innerHeight>=600&&!reduced.matches;section.dataset.enhanced=String(enabled);
   if(!enabled)return;
   if(document.hidden||!visible)return;
   const rect=section.getBoundingClientRect();
   const stageHeight=Math.min(460,innerHeight-120),travel=Math.max(1,rect.height-stageHeight);
   const progress=clamp((100-rect.top)/travel),position=progress*(stories.length-.001);
   section.style.setProperty('--court-shift',String((.5-progress)*12)+'px');
   const nearest=Math.max(0,Math.min(stories.length-1,Math.floor(position)));
   for(const panel of section.querySelectorAll<HTMLElement>('[data-story-index]')){
    const i=Number(panel.dataset.storyIndex),local=position-i;
    panel.style.setProperty('--story-opacity',String((i===0?1:clamp(local/.08))*(i===stories.length-1?1:1-clamp((local-.9)/.1))));
    panel.style.setProperty('--headline-reveal',String(clamp((local+.1)/.45)));
    panel.style.setProperty('--detail-reveal',String(clamp((local-.25)/.2)));
    panel.style.setProperty('--action-reveal',String(clamp((local-.4)/.2)));
   }
   setIndex(current=>current===nearest?current:nearest);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};
  const observer=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);schedule()},{rootMargin:'100px'});
  observer.observe(section);mobile.addEventListener('change',schedule);reduced.addEventListener('change',schedule);addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);schedule();
  return()=>{observer.disconnect();mobile.removeEventListener('change',schedule);reduced.removeEventListener('change',schedule);removeEventListener('scroll',schedule);removeEventListener('resize',schedule);cancelAnimationFrame(frame)};
 },[stories.length]);
 const active=stories[index]||stories[0];
 return <section className={styles.section} aria-labelledby="on-this-day-title">
  <header className={styles.sectionHeading}><h2 id="on-this-day-title">Tal día como hoy.</h2><time dateTime={active.date}>{dateLabel(active.date)}</time></header>
  <div className={styles.desktopStories}>{stories.map((story,i)=><article key={story.id} className={styles.desktopStory}><div className={styles.desktopCopy}>{i>0&&<time dateTime={story.date}>{dateLabel(story.date)}</time>}<h3>{story.headline}</h3>{!story.players&&<p>{story.detail}</p>}<StoryAction story={story}/></div><div className={styles.desktopVisual}><StoryVisual story={story}/></div></article>)}</div>
  <div ref={sequence} className={styles.mobileSequence} style={{'--story-count':stories.length} as CSSProperties}><div className={styles.mobileStage}>
   <div className={styles.narrative}>
    {stories.map((story,i)=><article key={story.id} className={styles.story} onFocusCapture={()=>setIndex(i)} data-story-index={i} data-active={i===index||undefined}><h3>{story.headline.split(/\s+/).map((word,j,words)=><span key={j} className={styles.word} style={{'--word-start':j/words.length*.8} as CSSProperties}>{word}{j<words.length-1?' ':''}</span>)}</h3>{!story.players&&<p>{story.detail}</p>}<div className={styles.action}><StoryAction story={story}/></div></article>)}
   </div><div className={styles.visual} aria-live="off"><StoryVisual story={active}/></div></div>
  </div>
 </section>;
}
