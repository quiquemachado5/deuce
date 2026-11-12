'use client';
import Image from 'next/image';
import {useState} from 'react';
import PlayerInput from '@/components/PlayerInput';
import type {Photo} from '@/lib/imagery';
import styles from './comparison-study.module.css';

export default function ComparisonPlayerField({name,initial,label,tour,photo}:{name:string;initial:string;label:string;tour:'atp'|'wta';photo:Photo|null}){
 const[value,setValue]=useState(initial);
 const currentPhoto=value===initial?photo:null;
 return <div className={styles.playerField}>
  {currentPhoto?<Image src={currentPhoto.src} alt="" width={52} height={58} style={{objectFit:'cover',objectPosition:currentPhoto.objectPosition||'center'}}/>:<span className={styles.playerPlaceholder} aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg></span>}
  <PlayerInput clearOnFocus name={name} tour={tour} initial={initial} label={label} onValueChange={setValue}/>
 </div>;
}
