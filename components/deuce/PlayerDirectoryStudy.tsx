'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import EditorialPhoto from '@/components/EditorialPhoto';
import PlayerFlag from '@/components/PlayerFlag';
import type {Photo} from '@/lib/imagery';
import styles from './player-directory-study.module.css';
export type DirectoryStudyRow={name:string;href:string;country?:string;wins:number;played:number;rate:number;slams?:number;photo:Photo|null};
// Surface contract: Operate; sticky photographic index, structure 3 of six
// grounded candidates (cover grid, editorial lead, photographic index,
// alphabetical concordance, surface gallery, era index). Seed 0ff36439.
// DEUCE type, forest/paper/lime and native filters are fixed visual authority.
export function PlayerDirectoryStudy({rows,orderLabel}:{rows:DirectoryStudyRow[];orderLabel?:string}){
  const [selected,setSelected]=useState(0),active=rows[selected]||rows[0];
  if(!active)return <p className={styles.empty}>No hay resultados para esta búsqueda.</p>;
  return <div className={styles.index}><aside className={styles.stage} aria-label="Fotografía del jugador seleccionado" data-home-depth="28"><div className={styles.stageImage} key={active.name}><EditorialPhoto src={active.photo?.src} alt={active.photo?.alt||active.name} label={active.name} objectPosition={active.photo?.objectPosition} mobileObjectPosition={active.photo?.mobileObjectPosition} sizes="(max-width:759px) 100vw, 520px" priority/></div><span className={styles.shade}/><div className={styles.stageCopy}><h2><PlayerFlag code={active.country}/>{active.name}</h2><dl><div><dt>Victorias</dt><dd>{active.wins.toLocaleString('es-ES')}</dd></div><div><dt>Efectividad</dt><dd>{active.rate.toLocaleString('es-ES',{maximumFractionDigits:1})} %</dd></div></dl><Link href={active.href}>Ver carrera<ArrowUpRight size={20}/></Link></div></aside><nav className={styles.names} aria-label="Directorio de jugadores">{orderLabel&&<p className={styles.orderLabel}>{orderLabel}</p>}{rows.map((row,index)=><Link className={styles.row} key={row.href} href={row.href} data-active={selected===index||undefined} onPointerEnter={event=>{if(event.pointerType!=='touch')setSelected(index);}} onFocus={()=>setSelected(index)}><span className={styles.thumb}><EditorialPhoto src={row.photo?.thumbnail||row.photo?.src} alt="" label={row.name} objectPosition={row.photo?.objectPosition} sizes="70px"/></span><span className={styles.identity}><strong>{row.name}</strong><small><PlayerFlag code={row.country}/>{row.slams!==undefined?<>{row.slams} {row.slams===1?'Grand Slam':'Grand Slams'}<span aria-hidden="true"> · </span></>:null}{row.played.toLocaleString('es-ES')} partidos</small></span><span className={styles.rate}>{row.rate.toLocaleString('es-ES',{maximumFractionDigits:1})}<small>%</small></span><ArrowUpRight size={22}/></Link>)}</nav></div>;
}
