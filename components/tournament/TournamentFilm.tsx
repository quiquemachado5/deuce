'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { Play, X } from 'lucide-react';
import type { Photo } from '@/lib/imagery';
import { imageFocus } from '@/lib/image-focus';
import styles from './tournament-experience.module.css';

export function TournamentFilm({video,photo}:{video:{youtubeId:string;title:string};photo:Photo}){
  const [playing,setPlaying]=useState(false),trigger=useRef<HTMLButtonElement>(null);
  const close=()=>{setPlaying(false);requestAnimationFrame(()=>trigger.current?.focus());};
  return <section className={styles.film} data-home-depth="45" aria-label={video.title} onKeyDown={event=>{if(event.key==='Escape')close();}}>
    {playing?<><iframe src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`} title={video.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/><button className={styles.filmClose} aria-label="Cerrar vídeo" type="button" onClick={close}><X size={20}/></button></>:<><Image src={photo.src} alt={photo.alt} fill sizes="(max-width:600px) 100vw, 1120px" style={imageFocus(photo.objectPosition||'center',photo.mobileObjectPosition||photo.objectPosition||'center')}/><span className={styles.photoShade}/><button ref={trigger} type="button" onClick={()=>setPlaying(true)}><span><Play size={22} fill="currentColor"/></span><strong>{video.title}</strong></button></>}
  </section>;
}
