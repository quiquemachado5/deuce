'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import PlayerFlag from '@/components/PlayerFlag';
import type { MatchRecord } from '@/types/deuce';

const sections=[['resumen','Resumen'],['rendimiento','Rendimiento'],['temporadas','Temporadas'],['torneos','Torneos'],['enfrentamientos','Enfrentamientos'],['partidos','Partidos']] as const;

export function PlayerProfileNav(){
  const [active,setActive]=useState('resumen');
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(visible)setActive(visible.target.id);
    },{rootMargin:'-22% 0px -68% 0px',threshold:[0,.2,.5]});
    sections.forEach(([id])=>{const node=document.getElementById(id);if(node)observer.observe(node);});
    return()=>observer.disconnect();
  },[]);
  return <nav className="pp-section-nav" aria-label="Secciones del jugador">{sections.map(([id,label])=><a key={id} href={`#${id}`} aria-current={active===id?'location':undefined}>{label}</a>)}</nav>;
}

export type CareerSeason={year:number;wins:number;losses:number;titles:number;played:number};
type CareerMetric='balance'|'rate'|'titles'|'played';
export function PlayerCareerTimeline({seasons}:{seasons:CareerSeason[]}){
  const [metric,setMetric]=useState<CareerMetric>('balance');
  const maximum=Math.max(1,...seasons.flatMap(season=>metric==='balance'?[season.wins,season.losses]:metric==='rate'?[season.played?season.wins/season.played*100:0]:metric==='titles'?[season.titles]:[season.played]));
  const labels:{id:CareerMetric;label:string}[]=[{id:'balance',label:'Victorias / derrotas'},{id:'rate',label:'Efectividad'},{id:'titles',label:'Títulos'},{id:'played',label:'Partidos'}];
  return <div className="pp-career-chart">
    <div className="pp-chart-switch" role="group" aria-label="Dato mostrado en la evolución temporal">{labels.map(item=><button type="button" key={item.id} aria-pressed={metric===item.id} onClick={()=>setMetric(item.id)}>{item.label}</button>)}</div>
    <div className="pp-career-scroll" tabIndex={0} role="img" aria-label={`Evolución por temporada: ${labels.find(item=>item.id===metric)?.label}`}>
      <div className="pp-career-bars" style={{minWidth:`${Math.max(620,seasons.length*52)}px`}}>{seasons.map(season=>{
        const value=metric==='rate'?(season.played?season.wins/season.played*100:0):metric==='titles'?season.titles:metric==='played'?season.played:season.wins;
        const secondary=metric==='balance'?season.losses:0;
        const display=metric==='rate'?`${value.toLocaleString('es-ES',{maximumFractionDigits:1})} %`:String(value);
        return <div className="pp-career-season" key={season.year} title={`${season.year}: ${display}`}>
          <span className="pp-career-columns"><i className="pp-career-primary" style={{height:`${Math.max(value?4:1,value/maximum*100)}%`}}/><i className="pp-career-secondary" style={{height:`${Math.max(secondary?4:1,secondary/maximum*100)}%`}}/></span>
          <strong>{display}</strong><small>{season.year}</small>
        </div>;
      })}</div>
    </div>
    <div className="pp-chart-legend"><span><i/>Dato principal</span>{metric==='balance'&&<span><i/>Derrotas</span>}<small>{seasons.length<3?'Serie corta: lectura orientativa.':'Selecciona una métrica para comparar la carrera año a año.'}</small></div>
  </div>;
}

export type RivalCard={name:string;href:string;country?:string;played:number;won:number;surface:string;last:string};
export function PlayerRivals({rivals}:{rivals:RivalCard[]}){
  const [view,setView]=useState<'frequent'|'best'|'worst'>('frequent');
  const ordered=useMemo(()=>[...rivals].sort((a,b)=>view==='frequent'?b.played-a.played:view==='best'?(b.won/b.played)-(a.won/a.played):(a.won/a.played)-(b.won/b.played)).slice(0,6),[rivals,view]);
  if(rivals.length<2)return <div className="pp-empty"><strong>Muestra insuficiente</strong><p>Todavía no hay suficientes enfrentamientos registrados para crear un ranking de rivales.</p></div>;
  return <>
    <div className="pp-segmented" role="group" aria-label="Ordenar rivales"><button aria-pressed={view==='frequent'} onClick={()=>setView('frequent')}>Más enfrentados</button><button aria-pressed={view==='best'} onClick={()=>setView('best')}>Mejor balance</button><button aria-pressed={view==='worst'} onClick={()=>setView('worst')}>Peor balance</button></div>
    <div className="pp-rival-grid">{ordered.map(rival=>{const rate=rival.won/rival.played*100;return <Link href={rival.href} key={rival.name}>
      <span className="pp-rival-name">{rival.country&&<PlayerFlag code={rival.country}/>}<strong>{rival.name}</strong></span>
      <span className="pp-rival-balance"><b>{rival.won}–{rival.played-rival.won}</b><em>{rate.toLocaleString('es-ES',{maximumFractionDigits:1})} %</em></span>
      <span className="pp-rival-track" aria-hidden="true"><i style={{width:`${rate}%`}}/></span>
      <small>{rival.played} {rival.played===1?'enfrentamiento':'enfrentamientos'} · {rival.surface}</small><small>Último registro: {rival.last}</small>
    </Link>})}</div>
  </>;
}

export type CalendarItem={name:string;href?:string;outcome:string;outcomeKey:string;surface:string;surfaceKey:string;category:string;balance:string};
export function PlayerSeasonCalendar({items,years,currentYear,baseHref}:{items:CalendarItem[];years:number[];currentYear:number;baseHref:string}){
  const router=useRouter();
  const [result,setResult]=useState('all'),[surface,setSurface]=useState('all'),[category,setCategory]=useState('all');
  const results=[...new Set(items.map(item=>item.outcomeKey))];
  const surfaces=[...new Set(items.map(item=>item.surfaceKey).filter(Boolean))];
  const categories=[...new Set(items.map(item=>item.category).filter(Boolean))];
  const visible=items.filter(item=>(result==='all'||item.outcomeKey===result)&&(surface==='all'||item.surfaceKey===surface)&&(category==='all'||item.category===category));
  return <>
    <div className="pp-calendar-controls">
      <label><span>Temporada</span><select value={currentYear} onChange={event=>router.push(`${baseHref}?year=${event.target.value}#temporadas`)}>{years.map(year=><option key={year}>{year}</option>)}</select><ChevronDown size={14} aria-hidden="true"/></label>
      <label><span>Resultado</span><select value={result} onChange={event=>setResult(event.target.value)}><option value="all">Todos</option>{results.map(value=><option key={value} value={value}>{value==='title'?'Título':value==='final'?'Final':value==='semifinal'?'Semifinal':value==='early'?'Derrota temprana':'Otros'}</option>)}</select><ChevronDown size={14} aria-hidden="true"/></label>
      <label><span>Superficie</span><select value={surface} onChange={event=>setSurface(event.target.value)}><option value="all">Todas</option>{surfaces.map(value=><option key={value} value={value}>{items.find(item=>item.surfaceKey===value)?.surface||value}</option>)}</select><ChevronDown size={14} aria-hidden="true"/></label>
      <label><span>Categoría</span><select value={category} onChange={event=>setCategory(event.target.value)}><option value="all">Todas</option>{categories.map(value=><option key={value}>{value}</option>)}</select><ChevronDown size={14} aria-hidden="true"/></label>
    </div>
    {visible.length?<div className="pp-calendar-list">{visible.map(item=>{const content=<><span><small>{item.category} · {item.surface}</small><strong>{item.name}</strong></span><span><b>{item.outcome}</b><small>{item.balance}</small></span></>;return item.href?<Link key={item.name} href={item.href} data-outcome={item.outcomeKey}>{content}<ArrowUpRight size={16} aria-hidden="true"/></Link>:<div key={item.name} className="is-missing">{content}</div>})}</div>:<div className="pp-empty"><strong>No hay torneos con estos filtros</strong><p>Prueba otra combinación de resultado, superficie o categoría.</p></div>}
  </>;
}

export type RecentMatch={record:MatchRecord;won:boolean;surface:string;opponent:string};
export function PlayerRecentMatches({matches}:{matches:RecentMatch[]}){
  const [filter,setFilter]=useState('recent');
  const visible=matches.filter(item=>filter==='recent'||filter==='wins'&&item.won||filter==='losses'&&!item.won||filter==='slams'&&item.record.category==='Grand Slam'||filter===item.record.surface);
  const surfaceOptions=[...new Set(matches.map(item=>item.record.surface).filter(Boolean))];
  return <>
    <div className="pp-segmented pp-match-filters" role="group" aria-label="Filtrar últimos partidos"><button aria-pressed={filter==='recent'} onClick={()=>setFilter('recent')}>Más recientes</button><button aria-pressed={filter==='wins'} onClick={()=>setFilter('wins')}>Victorias</button><button aria-pressed={filter==='losses'} onClick={()=>setFilter('losses')}>Derrotas</button><button aria-pressed={filter==='slams'} onClick={()=>setFilter('slams')}>Grand Slam</button>{surfaceOptions.slice(0,3).map(surface=><button key={surface} aria-pressed={filter===surface} onClick={()=>setFilter(surface!)}>{matches.find(item=>item.record.surface===surface)?.surface}</button>)}</div>
    {visible.length?<div className="pp-recent-list">{visible.map(({record,won,surface,opponent})=><Link key={record.id} href={record.href} className={won?'is-win':'is-loss'}>
      <span className="pp-match-event"><small>{record.date?new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${record.date}T12:00:00Z`)):record.year}</small><strong>{record.tournament}</strong><em>{record.round} · {surface}</em></span>
      <span className="pp-match-opponent"><small>Rival</small><strong>{opponent}</strong></span>
      <span className="pp-match-score"><b>{won?'Victoria':'Derrota'}</b><strong>{record.sets.map(set=>set.games.join('–')).join(', ')||'Resultado no disponible'}</strong></span>
      <span className="pp-match-link">Ver partido <ArrowUpRight size={15} aria-hidden="true"/></span>
    </Link>)}</div>:<div className="pp-empty"><strong>No hay partidos en esta selección</strong><p>Este dato todavía no está disponible en el archivo.</p></div>}
  </>;
}
