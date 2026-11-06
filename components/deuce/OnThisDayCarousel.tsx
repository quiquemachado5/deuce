"use client";

import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { imageFocus } from '@/lib/image-focus';
import styles from './OnThisDayCarousel.module.css';

export type OnThisDayStory={
  id:string;
  year:number;
  date:string;
  context:string;
  winner:string;
  loser:string;
  score:string;
  photo?:{src:string;thumbnail?:string;alt:string;objectPosition?:string;mobileObjectPosition?:string};
};

export function OnThisDayCarousel({ stories }: { stories:OnThisDayStory[] }) {
  const [current,setCurrent]=useState(0);

  if(!stories.length)return null;
  const active=stories[Math.min(current,stories.length-1)];
  const photo=active.photo;
  const editions=new Set(stories.map(story=>story.year)).size;
  const hasArchive=stories.length>1;
  return <section className={`home-section legacy-daily ${styles.section}`} aria-labelledby="on-this-day-title">
    <div className={`legacy-daily-head ${styles.header}`}><h2 id="on-this-day-title">Tal día como hoy</h2><time>{active.date}</time></div>
    <div className={`${styles.layout}${hasArchive?'':` ${styles.layoutSolo}`}`}>
      <article className={`legacy-daily-card ${styles.feature}${photo?'':` without-photo ${styles.withoutPhoto}`}`} key={active.id}>
        {photo&&<div className={`legacy-daily-photo ${styles.photo}`}><Image className="art-directed-photo" unoptimized src={photo.src} alt={photo.alt} fill sizes="(max-width:800px) 94vw, 72vw" style={imageFocus(photo.objectPosition||'center top',photo.mobileObjectPosition||photo.objectPosition||'center top')}/></div>}
        <span className={`legacy-daily-shade ${styles.shade}`} aria-hidden="true"/>
        <div className={`legacy-daily-copy ${styles.copy}`}>
          <h3><span>{active.winner}</span><span>{active.loser}</span></h3>
          <div className={styles.result}><p className={`legacy-daily-score ${styles.score}`}>{active.score}</p><Link href={`/match/${active.id}`}>Abrir partido <ArrowUpRight size={19} aria-hidden="true"/></Link></div>
        </div>
      </article>
      {hasArchive&&<aside className={styles.rail} aria-label="Más partidos de este día">
        <div className={styles.stats}><span><strong>{stories.length}</strong> partidos</span><span><strong>{editions}</strong> ediciones</span></div>
        <div className={`legacy-daily-archive ${styles.archive}`}>{stories.map((item,index)=><button className={styles.archiveItem} type="button" aria-pressed={current===index} onClick={()=>setCurrent(index)} key={item.id}>{item.photo&&<span className={`legacy-daily-archive-photo ${styles.archivePhoto}`}><Image className="art-directed-photo" unoptimized src={item.photo.thumbnail||item.photo.src} alt="" fill sizes="(max-width:759px) 44vw, 14vw" style={imageFocus(item.photo.objectPosition||'center top',item.photo.mobileObjectPosition||item.photo.objectPosition||'center top')}/></span>}<span className={`legacy-daily-archive-shade ${styles.archiveShade}`} aria-hidden="true"/><span className={`legacy-daily-archive-copy ${styles.archiveCopy}`}><strong>{item.year}</strong><span>{item.winner}</span><small>{item.score}</small></span></button>)}</div>
      </aside>}
    </div>
  </section>;
}
