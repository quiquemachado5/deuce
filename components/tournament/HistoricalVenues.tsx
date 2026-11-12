'use client';
import Link from 'next/link';
import {useRef,useState} from 'react';
import {ArrowUpRight,ChevronDown} from 'lucide-react';
import type {VenueStudy} from './TournamentDirectoryStudy';
import styles from './tournament-directory-study.module.css';
export function HistoricalVenues({venues}:{venues:VenueStudy[]}){
 const[expanded,setExpanded]=useState(false),list=useRef<HTMLDivElement>(null);
 return <><div className={styles.names} ref={list}>{venues.slice(0,expanded?undefined:6).map(venue=><Link key={venue.slug} href={venue.href} data-historical="true"><strong>{venue.name}</strong><ArrowUpRight size={20}/></Link>)}</div>{!expanded&&venues.length>6&&<button className={styles.revealArchive} type="button" onClick={()=>{setExpanded(true);requestAnimationFrame(()=>list.current?.querySelectorAll<HTMLAnchorElement>('a')[6]?.focus())}}>Ver más <ChevronDown size={14} aria-hidden="true"/></button>}</>;
}
