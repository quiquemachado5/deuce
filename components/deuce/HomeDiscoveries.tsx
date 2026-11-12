'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Play, X } from 'lucide-react';
import type { Photo } from '@/lib/imagery';
import { imageFocus } from '@/lib/image-focus';
import styles from './home-discoveries.module.css';

type Court={key:string;name:string;venue:string;photo:Photo};
type Film={youtubeId:string;title:string;channel:string;source:string};

export function HomeRivalry({first,second}:{first:Photo;second:Photo}){
  return <section className={styles.rivalry} aria-labelledby="home-rivalry-title" data-home-depth="70">
    <div className={styles.duelImages}>
      {[{photo:first,name:'Roger Federer'},{photo:second,name:'Rafael Nadal'}].map(({photo,name},i)=><div className={styles.duelPhoto} key={name} data-side={i}><Image src={photo.src} alt={photo.alt} fill sizes="(max-width:759px) 50vw, 50vw" style={imageFocus(photo.objectPosition||'center',photo.mobileObjectPosition||photo.objectPosition||'center')}/><span>{name}</span></div>)}
    </div>
    <div className={styles.duelCopy}><h2 id="home-rivalry-title">El rival también<br/>hace la leyenda.</h2><Link href="/comparar?a=Roger+Federer&b=Rafael+Nadal" className={styles.action}>Federer contra Nadal <ArrowUpRight size={21}/></Link></div>
  </section>;
}

export function HomeCourtExplorer({courts}:{courts:Court[]}){
  const [selected,setSelected]=useState(0);
  const court=courts[selected];
  if(!court)return null;
  return <section className={styles.courts} aria-labelledby="home-courts-title">
    <div className={styles.courtHeading}><h2 id="home-courts-title">Cambia la pista.<br/><span>Cambia la historia.</span></h2><div className={styles.courtTabs} role="group" aria-label="Elegir superficie">{courts.map((item,index)=><button key={item.key} type="button" aria-pressed={selected===index} onClick={()=>setSelected(index)}>{item.name}</button>)}</div></div>
    <div className={styles.courtStage} data-home-depth="65" data-surface={court.key}>
      <div className={styles.courtPhoto} key={court.key}><Image src={court.photo.src} alt={court.photo.alt} fill sizes="(max-width:759px) 100vw, 1100px" style={imageFocus(court.photo.objectPosition||'center',court.photo.mobileObjectPosition||'center')}/></div>
      <div className={styles.courtCopy}><div><span>{court.name}</span><h3>{court.venue}</h3></div><div className={styles.circuitLinks}><Link href={`/partidos?surface=${court.key}&tour=atp`}>Explorar ATP <ArrowUpRight size={19}/></Link><Link href={`/partidos?surface=${court.key}&tour=wta`}>Explorar WTA <ArrowUpRight size={19}/></Link></div></div>
    </div>
  </section>;
}

export function HomeCinema({film:initialFilm,photo}:{film:Film;photo:Photo}){
  const films=[{...initialFilm,label:"Alcaraz · Zverev",caption:"La final de Roland Garros 2024"},{youtubeId:"K-VmllVIOXA",title:"Carlos Alcaraz vs Novak Djokovic: Final Highlights | Wimbledon 2023",channel:"Wimbledon",source:"https://www.youtube.com/watch?v=K-VmllVIOXA",label:"Alcaraz · Djokovic",caption:"La final de Wimbledon 2023"},{youtubeId:"IwBCCvWRoFQ",title:"Novak Djokovic v Rafael Nadal - Australian Open 2012 Final | AO Classics",channel:"Australian Open",source:"https://www.youtube.com/watch?v=IwBCCvWRoFQ",label:"Djokovic · Nadal",caption:"La final del Australian Open 2012"}];
  const [filmIndex,setFilmIndex]=useState(0);
  const film=films[filmIndex];
  const [playing,setPlaying]=useState(false);
  useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden&&!playing)setFilmIndex(index=>(index+1)%films.length)},45000);return()=>clearInterval(timer)},[playing,films.length]);
  return <section className={styles.cinema} aria-labelledby="home-cinema-title" data-home-depth="100" data-home-scene="cinema" data-playing={playing||undefined}>
    <div className={styles.cinemaHeading}><h2 id="home-cinema-title">Hay que verlo.</h2></div>
    <div className={styles.cinemaStage}>
      {playing?<><iframe src={`https://www.youtube-nocookie.com/embed/${film.youtubeId}?autoplay=1&rel=0`} title={film.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/><button className={styles.closeVideo} type="button" onClick={()=>setPlaying(false)} aria-label="Cerrar vídeo"><X size={21}/></button></>:<><div className={styles.cinemaPhoto}><Image src={filmIndex===0?photo.src:filmIndex===1?"/images/editorial/wimbledon-final-2023-cinema.webp":"/media/editions-v31/slams/australian-open-2012-atp-6bc9625b22.webp"} alt={film.title} fill sizes="100vw" style={filmIndex===0?imageFocus(photo.objectPosition||'center',photo.mobileObjectPosition||'center'):imageFocus('50% 55%','56% 52%')}/></div><button type="button" className={styles.playFilm} onClick={()=>setPlaying(true)}><span className={styles.playMark}><Play size={25} fill="currentColor"/></span><span><strong>{film.label}</strong><small>{film.caption}</small></span><ArrowUpRight size={24}/></button></>}
    </div>
  </section>;
}
