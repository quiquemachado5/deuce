'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import PlayerFlag from '@/components/PlayerFlag';
import { ArchiveMatchRow } from '@/components/deuce/MatchArchivePage';
import type { MatchRecord } from '@/types/deuce';

const sections=[['resumen','Resumen','always'],['rendimiento','Rendimiento','always'],['temporadas','Temporadas','seasons'],['torneos','Torneos','tournaments'],['enfrentamientos','Enfrentamientos','rivals'],['partidos','Partidos','always']] as const;

function useHorizontalScrollCue<T extends HTMLElement>(){
  const ref=useRef<T>(null);
  useEffect(()=>{
    const node=ref.current;
    if(!node)return;
    const update=()=>{
      const hasHiddenContent=node.scrollWidth>node.clientWidth+2;
      const hasMoreRight=node.scrollLeft<node.scrollWidth-node.clientWidth-2;
      if(hasHiddenContent&&hasMoreRight)node.dataset.scrollCue='right';
      else delete node.dataset.scrollCue;
    };
    update();
    node.addEventListener('scroll',update,{passive:true});
    const resizeObserver=new ResizeObserver(update);
    const mutationObserver=new MutationObserver(update);
    resizeObserver.observe(node);
    mutationObserver.observe(node,{childList:true,subtree:true,characterData:true});
    return()=>{node.removeEventListener('scroll',update);resizeObserver.disconnect();mutationObserver.disconnect();};
  },[]);
  return ref;
}

export function PlayerProfileNav({hasRivals=true,hasTournaments=true,hasSeasons=true}:{hasRivals?:boolean;hasTournaments?:boolean;hasSeasons?:boolean}){
  const [active,setActive]=useState('resumen');
  const scrollRef=useHorizontalScrollCue<HTMLElement>();
  const visibleSections=useMemo(()=>sections.filter(([, ,condition])=>condition==='always'||condition==='rivals'&&hasRivals||condition==='tournaments'&&hasTournaments||condition==='seasons'&&hasSeasons),[hasRivals,hasSeasons,hasTournaments]);
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(visible)setActive(visible.target.id);
    },{rootMargin:'-22% 0px -68% 0px',threshold:[0,.2,.5]});
    visibleSections.forEach(([id])=>{const node=document.getElementById(id);if(node)observer.observe(node);});
    return()=>observer.disconnect();
  },[visibleSections]);
  return <nav ref={scrollRef} className="pp-section-nav" aria-label="Secciones del jugador">{visibleSections.map(([id,label])=><a key={id} href={`#${id}`} aria-current={active===id?'location':undefined}>{label}</a>)}</nav>;
}

export type CareerSeason={year:number;wins:number;losses:number;titles:number;played:number};
type CareerMetric='rate'|'titles'|'played';
function smoothPath(points:{x:number;y:number}[]){
  if(points.length<2)return points[0]?`M ${points[0].x} ${points[0].y}`:'';
  return points.reduce((path,point,index)=>{
    if(index===0)return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    const previous=points[index-1],before=points[index-2]||previous,after=points[index+1]||point;
    const control1={x:previous.x+(point.x-before.x)/6,y:previous.y+(point.y-before.y)/6};
    const control2={x:point.x-(after.x-previous.x)/6,y:point.y-(after.y-previous.y)/6};
    return `${path} C ${control1.x.toFixed(2)} ${control1.y.toFixed(2)}, ${control2.x.toFixed(2)} ${control2.y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  },'');
}

export function PlayerCareerTimeline({seasons}:{seasons:CareerSeason[]}){
  const [metric,setMetric]=useState<CareerMetric>('rate');
  const [activeIndex,setActiveIndex]=useState(()=>Math.max(0,seasons.length-1));
  const scrollRef=useHorizontalScrollCue<HTMLDivElement>();
  const labels:{id:CareerMetric;label:string}[]=[{id:'rate',label:'Efectividad'},{id:'titles',label:'Títulos'},{id:'played',label:'Partidos'}];
  const values=seasons.map(season=>metric==='rate'?(season.played?season.wins/season.played*100:0):metric==='titles'?season.titles:season.played);
  const maximum=Math.max(1,...values);
  const domainMaximum=metric==='rate'?Math.min(100,Math.max(maximum+3,maximum*1.08)):Math.ceil(maximum*1.14);
  const chart={left:54,right:810,top:28,bottom:238};
  const x=(index:number)=>seasons.length<2?(chart.left+chart.right)/2:chart.left+index/(seasons.length-1)*(chart.right-chart.left);
  const y=(value:number)=>chart.bottom-value/domainMaximum*(chart.bottom-chart.top);
  const primaryPoints=values.map((value,index)=>({x:x(index),y:y(value)}));
  const line=smoothPath(primaryPoints);
  const area=`${line} L ${x(values.length-1).toFixed(2)} ${chart.bottom} L ${x(0).toFixed(2)} ${chart.bottom} Z`;
  const display=(value:number)=>metric==='rate'?`${value.toLocaleString('es-ES',{maximumFractionDigits:1})} %`:value.toLocaleString('es-ES');
  const yearTicks=useMemo(()=>{
    const count=Math.min(5,seasons.length);
    return [...new Set(Array.from({length:count},(_,tick)=>Math.round(tick*(seasons.length-1)/Math.max(1,count-1))))];
  },[seasons.length]);
  const active={season:seasons[activeIndex],value:values[activeIndex],point:primaryPoints[activeIndex]};
  const selectPointer=(event:React.PointerEvent<HTMLDivElement>)=>{const bounds=event.currentTarget.getBoundingClientRect();const relative=Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width));setActiveIndex(Math.round(relative*(seasons.length-1)));};
  return <div className="pp-career-chart">
    <div className="pp-career-header"><h2 id="pp-seasons-title">Evolución temporal</h2><div ref={scrollRef} className="pp-chart-switch" role="group" aria-label="Dato mostrado en la evolución temporal">{labels.map(item=><button type="button" key={item.id} aria-pressed={metric===item.id} onClick={()=>setMetric(item.id)}>{item.label}</button>)}</div></div>
    <output className="pp-chart-reading" aria-live="polite"><span>{active.season.year}</span><strong>{display(active.value)}</strong></output>
    <div className="pp-career-plot" role="img" tabIndex={0} aria-label={`Evolución por temporada: ${labels.find(item=>item.id===metric)?.label}, de ${seasons[0]?.year} a ${seasons.at(-1)?.year}. Desliza o toca para consultar un año.`} onPointerDown={selectPointer} onPointerMove={selectPointer} onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();setActiveIndex(index=>Math.max(0,Math.min(seasons.length-1,index+(event.key==='ArrowRight'?1:-1))));}}}>
      <svg viewBox="0 0 864 278" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="pp-timeline-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1c7a50" stopOpacity=".18"/><stop offset="100%" stopColor="#1c7a50" stopOpacity="0"/></linearGradient></defs>
        {[0,.5,1].map(step=><g key={step}><line x1={chart.left} x2={chart.right} y1={y(domainMaximum*step)} y2={y(domainMaximum*step)} className="pp-chart-grid"/><text x="8" y={y(domainMaximum*step)+4}>{display(domainMaximum*step)}</text></g>)}
        <path d={area} className="pp-chart-area"/><path d={line} className="pp-chart-line"/>
        <line x1={active.point.x} x2={active.point.x} y1={chart.top} y2={chart.bottom} className="pp-chart-cursor"/><circle cx={active.point.x} cy={active.point.y} r="5" className="pp-chart-dot"/>
        {yearTicks.map(index=><text key={seasons[index].year} x={x(index)} y="267" textAnchor={index===0?'start':index===seasons.length-1?'end':'middle'} className="pp-chart-year">{seasons[index].year}</text>)}
      </svg>
      <div className="pp-chart-tooltip" style={{left:`${active.point.x/864*100}%`,top:`${active.point.y/278*100}%`}}><span>{active.season.year}</span><strong>{display(active.value)}</strong></div>
    </div>
    <details className="pp-chart-table"><summary>Ver valores por temporada</summary><table><thead><tr><th>Año</th><th>{labels.find(item=>item.id===metric)?.label}</th></tr></thead><tbody>{seasons.map((season,index)=><tr key={season.year}><th>{season.year}</th><td>{display(values[index])}</td></tr>)}</tbody></table></details>
  </div>;
}

export type RankingPoint={year:number;rank:number};
export function PlayerRankingSlider({points}:{points:RankingPoint[]}){
  const [index,setIndex]=useState(0),[paused,setPaused]=useState(false);
  const selected=points[index]||points.at(-1)!;
  useEffect(()=>{
    if(paused||points.length<2||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const timer=window.setInterval(()=>setIndex(current=>(current+1)%points.length),3200);
    return()=>window.clearInterval(timer);
  },[paused,points.length]);
  return <section className="pp-section pp-ranking" aria-labelledby="pp-ranking-title">
    <div className="pp-section-heading"><div><h2 id="pp-ranking-title">Ranking observado</h2></div></div>
    <div className="pp-ranking-slider" onPointerEnter={()=>setPaused(true)} onPointerLeave={()=>setPaused(false)} onFocusCapture={()=>setPaused(true)} onBlurCapture={()=>setPaused(false)}>
      <button type="button" onClick={()=>setIndex(value=>(value-1+points.length)%points.length)} aria-label="Temporada anterior"><ChevronLeft aria-hidden="true"/></button>
      <article key={selected.year} data-number-one={selected.rank===1||undefined} data-rank-digits={String(selected.rank).length} aria-live="polite" aria-atomic="true" aria-label={`${selected.year}, ranking número ${selected.rank}`}><div><span>Año</span><strong>{selected.year}</strong></div><div><span>Ranking</span><strong>{selected.rank.toLocaleString('es-ES')}</strong></div></article>
      <button type="button" onClick={()=>setIndex(value=>(value+1)%points.length)} aria-label="Temporada siguiente"><ChevronRight aria-hidden="true"/></button>
    </div>
  </section>;
}

export type RivalCard={name:string;href:string;country?:string;played:number;won:number;surface:string};
export function PlayerRivals({rivals,player,compareHref}:{rivals:RivalCard[];player:{name:string;country?:string};compareHref:string}){
  const [view,setView]=useState<'frequent'|'best'|'worst'>('frequent');
  const scrollRef=useHorizontalScrollCue<HTMLDivElement>();
  const ordered=useMemo(()=>[...rivals].sort((a,b)=>view==='frequent'?b.played-a.played:view==='best'?(b.won/b.played)-(a.won/a.played):(a.won/a.played)-(b.won/b.played)).slice(0,6),[rivals,view]);
  if(rivals.length<2)return <div className="pp-empty"><strong>Muestra insuficiente</strong><p>Todavía no hay suficientes enfrentamientos registrados para crear un ranking de rivales.</p></div>;
  return <>
    <div className="pp-rivals-heading"><h2 id="pp-rivals-title">Rivales y enfrentamientos</h2><div ref={scrollRef} className="pp-segmented" role="group" aria-label="Ordenar rivales"><button aria-pressed={view==='frequent'} onClick={()=>setView('frequent')}>Más enfrentados</button><button aria-pressed={view==='best'} onClick={()=>setView('best')}>Mejor balance</button><button aria-pressed={view==='worst'} onClick={()=>setView('worst')}>Peor balance</button></div></div>
    <div className="pp-rival-grid">{ordered.map(rival=>{const opponentWins=rival.played-rival.won,currentLeads=rival.won>opponentWins,opponentLeads=opponentWins>rival.won;return <Link href={rival.href} key={rival.name} aria-label={`${rival.name}, ${opponentWins}; ${player.name}, ${rival.won}`}>
      <span className="pp-rival-side" data-leading={opponentLeads||undefined}><span>{rival.country&&<PlayerFlag code={rival.country}/>}<strong>{rival.name}</strong></span><b>{opponentWins}</b></span>
      <i aria-hidden="true">—</i>
      <span className="pp-rival-side" data-leading={currentLeads||undefined}><span>{player.country&&<PlayerFlag code={player.country}/>}<strong>{player.name}</strong></span><b>{rival.won}</b></span>
      <small>{rival.played} enfrentamientos</small>
    </Link>})}</div>
    <Link className="pp-compare-rivals" href={compareHref}>Comparar jugadores <ArrowUpRight size={15} aria-hidden="true"/></Link>
  </>;
}

export type TournamentArchiveItem={slug:string;name:string;surfaceKey:string;category:string;titles:number;titleYears:number[];brandingSrc?:string;trophySrc?:string;href?:string};
export function PlayerTournamentArchive({tournaments,tour='atp'}:{tournaments:TournamentArchiveItem[];tour?:'atp'|'wta'}){
  const [filter,setFilter]=useState<'all'|'slams'|'masters'|'500'>('all');
  const scrollRef=useHorizontalScrollCue<HTMLDivElement>();
  const visible=tournaments.filter(tournament=>tournament.titles>0&&(filter==='all'||filter==='slams'&&tournament.category==='Grand Slam'||filter==='masters'&&(['Masters 1000','Precursores de Masters','WTA 1000','WTA · alto nivel histórico'].includes(tournament.category))||filter==='500'&&(['ATP 500','WTA 500'].includes(tournament.category))));
  return <>
    <div className="pp-tournaments-heading"><h2 id="pp-tournaments-title">Torneos y palmarés</h2><div ref={scrollRef} className="pp-segmented" role="group" aria-label="Filtrar palmarés por categoría"><button aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Todos</button><button aria-pressed={filter==='slams'} onClick={()=>setFilter('slams')}>Grand Slam</button><button aria-pressed={filter==='masters'} onClick={()=>setFilter('masters')}>1000</button><button aria-pressed={filter==='500'} onClick={()=>setFilter('500')}>{tour.toUpperCase()} 500</button></div></div>
    {visible.length?<div className="pp-tournament-list">{visible.map(tournament=>{
      const monochrome=Boolean(tournament.brandingSrc&&/hamburg|paris|shanghai/.test(tournament.brandingSrc));
      const logo=<>{tournament.brandingSrc?<Image src={tournament.brandingSrc} alt="" width={92} height={72} unoptimized/>:<span aria-hidden="true">{tournament.name.split(/\s+/).map(part=>part[0]).slice(0,2).join('')}</span>}{tournament.href?<i aria-hidden="true"><ArrowUpRight size={14}/></i>:null}</>;
      const content=<><span className="pp-tournament-logo" data-monochrome={monochrome||undefined}>{logo}</span>
        <div><strong>{tournament.name}</strong><small>{tournament.titleYears.length?tournament.titleYears.join(', '):'Sin títulos en el archivo'}</small></div>
        <b>{tournament.trophySrc?<Image className="pp-tournament-trophy" src={tournament.trophySrc} alt="" width={18} height={24} unoptimized/>:<Trophy size={16} aria-hidden="true"/>}<span className="nc-sr">Títulos:</span>{tournament.titles.toLocaleString('es-ES')}</b></>;
      return tournament.href?<Link className="pp-tournament-entry" href={tournament.href} key={tournament.slug} data-event-surface={tournament.surfaceKey} aria-label={`Abrir ${tournament.name}, ${tournament.titles} ${tournament.titles===1?'título':'títulos'}`}>{content}</Link>:<article className="pp-tournament-entry" key={tournament.slug} data-event-surface={tournament.surfaceKey} aria-label={`${tournament.name}, ${tournament.titles} ${tournament.titles===1?'título':'títulos'}`}>{content}</article>;
    })}</div>:<div className="pp-empty"><strong>No hay títulos en este corte</strong><p>Este archivo no conserva un torneo de esa categoría ganado por el jugador.</p></div>}
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
export function PlayerRecentMatches({matches,allHref}:{matches:RecentMatch[];allHref:string}){
  const [filter,setFilter]=useState('recent');
  const scrollRef=useHorizontalScrollCue<HTMLDivElement>();
  const visible=matches.filter(item=>filter==='recent'||filter==='wins'&&item.won||filter==='losses'&&!item.won||filter==='slams'&&item.record.category==='Grand Slam'||filter===item.record.surface);
  const surfaceOptions=[...new Set(matches.map(item=>item.record.surface).filter(Boolean))];
  return <>
    <div className="pp-matches-heading"><h2 id="pp-matches-title">Últimos partidos</h2><div ref={scrollRef} className="pp-segmented pp-match-filters" role="group" aria-label="Filtrar últimos partidos"><button aria-pressed={filter==='recent'} onClick={()=>setFilter('recent')}>Más recientes</button><button aria-pressed={filter==='slams'} onClick={()=>setFilter('slams')}>Grand Slam</button>{surfaceOptions.slice(0,3).map(surface=><button key={surface} aria-pressed={filter===surface} onClick={()=>setFilter(surface!)}>{matches.find(item=>item.record.surface===surface)?.surface}</button>)}</div></div>
    {visible.length?<div className="pp-recent-cards">{visible.slice(0,5).map(({record})=><ArchiveMatchRow key={record.id} match={record} showTournamentContext/>)}</div>:<div className="pp-empty"><strong>No hay partidos en esta selección</strong><p>Este dato todavía no está disponible en el archivo.</p></div>}
    <Link className="pp-all-matches" href={allHref}>Ver todos los partidos <ArrowUpRight size={15} aria-hidden="true"/></Link>
  </>;
}
