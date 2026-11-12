import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import type {Photo} from '@/lib/imagery';
import {imageFocus} from '@/lib/image-focus';
import {HistoricalVenues} from './HistoricalVenues';
import styles from './tournament-directory-study.module.css';
export type VenueStudy={slug:string;name:string;category:string;href:string;photo:Photo|null;logo:string;latestYear:number;current?:boolean;surface?:string};
export function TournamentDirectoryStudy({venues}:{venues:VenueStudy[]}){
  const finals=venues.filter(venue=>/^(ATP|WTA) Finals$/.test(venue.category));
  const groups=[...new Set(venues.filter(venue=>!finals.includes(venue)).map(venue=>venue.category))];
  const columns=[...groups.filter(group=>group!=='Grand Slam'),...(finals.length?['Finals']:[])];
  if(!venues.length)return <p>No hay torneos en esta selección.</p>;
  const majors=venues.filter(venue=>venue.category==='Grand Slam');
  return <div className={styles.study}>{majors.length>0&&<div className={styles.majorGallery}>{majors.map((venue,index)=><Link className={styles.major} key={venue.slug} href={venue.href} data-venue={venue.slug}>{venue.photo&&<Image data-photo-motion="" src={venue.photo.src} alt={venue.photo.alt} fill priority={index===0} sizes="(max-width:760px) 100vw, 55vw" style={imageFocus(venue.photo.objectPosition||'center',venue.photo.mobileObjectPosition||'center')}/>}<span className={styles.majorShade}/><div><Image src={venue.logo||`/images/tournament-logos/${venue.category.startsWith('WTA')?'wta':'atp'}-official.svg`} alt="" width={70} height={70} unoptimized/><h2>{venue.name}</h2></div><ArrowUpRight className={styles.majorArrow} size={25}/></Link>)}</div>}{columns.length>0&&<div className={styles.directory} data-filtered={columns.length===1}>{columns.map(group=>group==='Finals'?<section key={group}><h3>Finals</h3><p className={styles.eraLabel}>Actualmente</p><div className={styles.names}>{finals.map(venue=><Link key={venue.slug} href={venue.href}><strong>{venue.name}</strong><ArrowUpRight size={20}/></Link>)}</div></section>:<section key={group}><h3>{group}</h3><p className={styles.eraLabel}>Actualmente</p><div className={styles.names}>{venues.filter(venue=>venue.category===group&&venue.current).map(venue=><Link key={venue.slug} href={venue.href} data-surface={venue.surface}><strong>{venue.name}</strong><ArrowUpRight size={20}/></Link>)}</div>{venues.some(venue=>venue.category===group&&!venue.current)&&<><p className={styles.eraLabel}>Otras etapas del archivo</p><HistoricalVenues venues={venues.filter(venue=>venue.category===group&&!venue.current)}/></>}</section>)}</div>}</div>;
}
