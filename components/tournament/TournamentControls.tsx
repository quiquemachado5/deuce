'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ArchiveFilterBar from '@/components/ArchiveFilterBar';
import styles from './tournament-experience.module.css';

export type TournamentArchiveOption={tour:'atp'|'wta';summaryHref:string;editions:{year:number;href:string}[]};

export function EditionYearRail({editions}:{editions:{year:number;href:string;champion:string;matches:number}[]}){
  const rail=useRef<HTMLDivElement>(null);
  const move=(direction:number)=>rail.current?.scrollBy({left:direction*(rail.current.clientWidth*.8),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  return <div className={styles.yearArchive}><div className={styles.yearTrack} ref={rail} role="region" aria-label="Ediciones del torneo" tabIndex={0} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}}}>{editions.map(edition=><Link href={edition.href} key={edition.year}><strong>{edition.year}</strong><span>{edition.champion}</span><small>{edition.matches.toLocaleString('es-ES')} partidos</small><ChevronRight size={18}/></Link>)}</div><div className={styles.railFooter}><button type="button" aria-label="Ediciones anteriores" onClick={()=>move(-1)}><ChevronLeft size={18}/></button><button type="button" aria-label="Más ediciones" onClick={()=>move(1)}><ChevronRight size={18}/></button></div></div>;
}

export function TournamentNavigator({options,tour,year,palette}:{options:TournamentArchiveOption[];tour:'atp'|'wta';year?:number;palette:{surface:string;panel:string;accent:string}}){
  const router=useRouter();
  const selected=options.find(option=>option.tour===tour);
  const circuits=options.map(option=>({label:option.tour.toUpperCase(),active:option.tour===tour,href:option.editions.find(edition=>edition.year===year)?.href||option.summaryHref}));
  return <ArchiveFilterBar key={tour+':'+(year||'summary')} circuits={circuits} circuitLabel="Circuito del torneo" panelTitle="Elegir edición" mobileIconOnly tone="dark" palette={palette} desktopLabel={year?String(year):"Resumen"} mobileLabel={`${tour.toUpperCase()} · ${year || "Resumen"}`}>
    <label className={styles.editionField}>Resumen o temporada
      <select className={styles.editionSelect} value={year?String(year):'summary'} onChange={event=>{
        const href=event.target.value==='summary'?selected?.summaryHref:selected?.editions.find(edition=>String(edition.year)===event.target.value)?.href;
        if(href)router.push(href);
      }}><option value="summary">Resumen general</option>{selected?.editions.map(edition=><option key={edition.year} value={edition.year}>{edition.year}</option>)}</select>
    </label>
  </ArchiveFilterBar>;
}

export function TournamentStoryRail({title,children,id='campeones'}:{title:string;children:ReactNode;id?:string}){
  const rail=useRef<HTMLDivElement>(null);
  const [edges,setEdges]=useState({start:true,end:false});
  useEffect(()=>{
    const element=rail.current;if(!element)return;
    let frame=0;
    const update=()=>{frame=0;const next={start:element.scrollLeft<3,end:element.scrollLeft>=element.scrollWidth-element.clientWidth-3};setEdges(previous=>previous.start===next.start&&previous.end===next.end?previous:next);};
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    const observer=new ResizeObserver(schedule);observer.observe(element);element.addEventListener('scroll',schedule,{passive:true});schedule();
    return()=>{observer.disconnect();element.removeEventListener('scroll',schedule);if(frame)cancelAnimationFrame(frame);};
  },[]);
  const move=(direction:number)=>rail.current?.scrollBy({left:direction*Math.max(250,rail.current.clientWidth*.72),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  return <section className={styles.chronology} id={id}><div className={styles.sectionTitle}><h2>{title}</h2><div className={styles.railButtons}><button type="button" aria-label="Desplazar hacia la izquierda" disabled={edges.start} onClick={()=>move(-1)}><ChevronLeft size={18}/></button><button type="button" aria-label="Desplazar hacia la derecha" disabled={edges.end} onClick={()=>move(1)}><ChevronRight size={18}/></button></div></div><div ref={rail} className={styles.championRail} tabIndex={0} role="region" aria-label={title} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}}}><ol>{children}</ol></div></section>;
}

export function PalmaresRail({rows}:{rows:{name:string;href:string;value:number;sample:number}[]}){
 const rail=useRef<HTMLDivElement>(null),[position,setPosition]=useState(0);
 const groups=Array.from({length:Math.ceil(rows.length/5)},(_,index)=>rows.slice(index*5,index*5+5));
 const move=(direction:number)=>rail.current?.scrollBy({left:direction*rail.current.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 return <div className={styles.palmaresCarousel}><div ref={rail} className={styles.palmaresTrack} tabIndex={0} role="region" aria-label="Palmarés por títulos" onScroll={event=>setPosition(Math.round(event.currentTarget.scrollLeft/event.currentTarget.clientWidth))}>{groups.map((group,page)=><ol className={styles.ranking} key={page} start={page*5+1}>{group.map((row,index)=><li key={row.name}><Link href={row.href}><span>{page*5+index+1}</span><strong>{row.name}<small>{row.sample} finales</small></strong><b>{row.value}</b></Link></li>)}</ol>)}</div>{groups.length>1&&<div className={styles.railFooter}><span>{position+1} / {groups.length}</span><button type="button" aria-label="Palmarés anterior" disabled={position===0} onClick={()=>move(-1)}><ChevronLeft size={18}/></button><button type="button" aria-label="Más campeones" disabled={position>=groups.length-1} onClick={()=>move(1)}><ChevronRight size={18}/></button></div>}</div>;
}
