'use client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {APPEARANCE_KEY,appearanceMode,courtSeason,type AppearanceMode} from '@/lib/appearance';
import styles from './deuce-footer.module.css';
const subscribeHydration=()=>()=>{};
export function AppearanceControl(){
 const[mode,setMode]=useState<AppearanceMode>('classic');
 const ready=useSyncExternalStore(subscribeHydration,()=>true,()=>false);
 useEffect(()=>{
  const apply=(value:unknown)=>{const next=appearanceMode(value);document.documentElement.dataset.appearance=next;document.documentElement.dataset.season=courtSeason(new Date());setMode(next)};
  const restore=()=>{try{apply(localStorage.getItem(APPEARANCE_KEY))}catch{apply('classic')}};
  restore();
  let timer:ReturnType<typeof setTimeout>;
  const schedule=()=>{const now=new Date(),next=new Date(now);next.setUTCHours(24,0,0,100);timer=setTimeout(()=>{restore();schedule()},next.getTime()-now.getTime())};schedule();
  const visible=()=>{if(!document.hidden)restore()};
  addEventListener('storage',restore);document.addEventListener('visibilitychange',visible);
  return()=>{clearTimeout(timer);removeEventListener('storage',restore);document.removeEventListener('visibilitychange',visible)};
 },[]);
 const change=(value:string)=>{const next=appearanceMode(value);setMode(next);document.documentElement.dataset.appearance=next;document.documentElement.dataset.season=courtSeason(new Date());try{localStorage.setItem(APPEARANCE_KEY,next)}catch{/* Preference remains valid for this visit. */}};
 return <label className={styles.appearance} title={'Modo de color'}><select disabled={!ready} aria-label={'Modo de color'} value={mode} onChange={event=>change(event.target.value)}><option value="classic">{'Clásico'}</option><option value="season">{'Temporada'}</option></select><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg></label>;
}
