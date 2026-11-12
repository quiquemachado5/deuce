'use client';

import { ChevronDown, ArrowDown, ArrowUp, SlidersHorizontal } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { CareerSeason, RankingPoint } from './PlayerProfileInteractive';
import { MatchScoreboard } from '@/components/deuce/MatchScoreboard';
import { scorecardPresentation } from '@/lib/scorecard-presentation';
import type { MatchRecord } from '@/types/deuce';
import { number } from '@/lib/cuaderno/model';
import styles from '@/app/players/player-profile-proposal.module.css';

export function ProfileProposalMotion({ children, className }: { children: ReactNode; className: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = matchMedia('(prefers-reduced-motion: no-preference)');
    const scenes = [...element.querySelectorAll<HTMLElement>('[data-profile-scene]')];
    let frame = 0;
    const update = () => {
      frame = 0;
      for (const scene of scenes) {
        if (!media.matches) { scene.style.removeProperty('--scene-progress'); scene.style.removeProperty('--scene-shift'); continue; }
        const rect = scene.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > innerHeight + 100) continue;
        const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
        const desktop = innerWidth >= 960;
        const limit = Math.min(desktop ? 48 : 9, rect.height * (desktop ? .06 : .02));
        const shift = Math.max(-limit, Math.min(limit, (innerHeight / 2 - rect.top - rect.height / 2) * (desktop ? .14 : .035)));
        scene.style.setProperty('--scene-progress', progress.toFixed(4));
        scene.style.setProperty('--scene-shift', shift.toFixed(2) + 'px');
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    schedule();
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    media.addEventListener('change', schedule);
    return () => { if (frame) cancelAnimationFrame(frame); removeEventListener('scroll', schedule); removeEventListener('resize', schedule); media.removeEventListener('change', schedule); };
  }, []);
  return <div ref={root} className={className}>{children}</div>;
}

type PerformanceRow = {key:string;label:string;wins:number;losses:number;played:number;rate:number};
export function ProfilePerformance({surfaces,categories}:{
  surfaces:PerformanceRow[];categories:{key:string;label:string;wins:number;played:number;rate:number}[];
}){
  const [view,setView]=useState<'surfaces'|'categories'>('surfaces');
  const rows=view==='surfaces'?surfaces:categories.map(row=>({...row,losses:row.played-row.wins}));
  return <div className={styles.performanceExplorer}>
    <div className={styles.sectionHeading}><h2 id="proposal-performance-title">Rendimiento.</h2>
      <div className={styles.performanceSwitch} role="group" aria-label="Agrupar rendimiento">
        <button type="button" aria-pressed={view==='surfaces'} onClick={()=>setView('surfaces')}>Superficies</button>
        <button type="button" aria-pressed={view==='categories'} onClick={()=>setView('categories')}>Categorías</button>
      </div>
      <label className={styles.performanceSelect} title={'Mostrar '+(view==='surfaces'?'superficies':'categorías')}><select aria-label="Agrupar rendimiento" value={view} onChange={event=>setView(event.target.value as 'surfaces'|'categories')}><option value="surfaces">Superficies</option><option value="categories">Categorías</option></select><SlidersHorizontal size={18} aria-hidden="true"/></label>
    </div>
    {rows.length ? <div className={styles.performanceRows}>
      {rows.map(row=><article key={row.key} data-surface={row.key} className={styles.performanceRow}>
        <div className={styles.performanceIdentity}><h3>{row.label}</h3></div>
        <div className={styles.performanceVisual}><strong className={styles.performanceRate}>{number(row.rate,1)}<span> %</span></strong><div className={styles.performanceTrack} aria-hidden="true"><i style={{width:row.rate+'%'}}/></div></div>
          <dl className={styles.performanceTotals}><div><dt>Victorias</dt><dd>{number(row.wins)}</dd></div><div><dt>Derrotas</dt><dd>{number(row.losses)}</dd></div><div><dt>Partidos</dt><dd>{number(row.played)}</dd></div></dl>
      </article>)}
    </div>:<p>No hay resultados en esta selección.</p>}
  </div>;
}

export function ProfileWinningRun({matches,name}:{matches:MatchRecord[];name:string}){
  const [index,setIndex]=useState(Math.max(0,matches.length-1));
  const id=useId();
  if(!matches.length)return null;
  const selected=matches[index]||matches.at(-1)!;
  const choose=(event:React.KeyboardEvent<HTMLButtonElement>,position:number)=>{
    let next:number;
    if(event.key==='ArrowLeft')next=Math.max(0,position-1);
    else if(event.key==='ArrowRight')next=Math.min(matches.length-1,position+1);
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=matches.length-1;
    else return;
    event.preventDefault();setIndex(next);
    document.getElementById(id+'-'+next)?.focus();
  };
  return <article className={styles.streakExplorer}>
    <div className={styles.runHeading}><h3>Su mayor racha</h3><p><strong>{number(matches.length)}</strong> victorias consecutivas</p></div>
    <div className={styles.runMatches} role="tablist" aria-label={'Partidos de la racha de '+name}>
      {matches.map((match,position)=>{
        const opponent=match.players[match.winnerIndex===0?1:0].name;
        const view=scorecardPresentation(match);
        const description='Victoria '+(position+1)+': '+match.tournament+', '+view.round+', ante '+opponent+', '+view.date;
        return <button key={match.id} id={id+'-'+position} role="tab" type="button" tabIndex={position===index?0:-1} aria-selected={position===index}
          aria-controls={id+'-result'} aria-label={description} title={description}
          onPointerEnter={event=>{if(event.pointerType==='mouse')setIndex(position)}} onFocus={()=>setIndex(position)} onClick={()=>setIndex(position)} onKeyDown={event=>choose(event,position)}><span aria-hidden="true"/></button>;
      })}
    </div>
    <div id={id+'-result'} role="tabpanel" aria-labelledby={id+'-'+index} className={styles.runResult}>
      <MatchScoreboard match={selected}/>
    </div>
  </article>;
}

type SeasonMetric = 'wins' | 'titles' | 'rate';
type SeasonSort = SeasonMetric | 'year' | 'losses';
export function ProfileSeasonExplorer({ seasons, ranking }: { seasons: CareerSeason[]; ranking: RankingPoint[] }) {
  const best = [...seasons].sort((a,b)=>b.wins-a.wins||b.titles-a.titles)[0];
  const [selectedYear, setYear] = useState(best?.year);
  const [metric, setMetric] = useState<SeasonMetric>('wins');
  const [view,setView]=useState<'chart'|'table'>('chart');
  const [sort,setSort]=useState<{key:SeasonSort;descending:boolean}>({key:'year',descending:true});
  const selectId = useId();
  const plot = useRef<HTMLDivElement>(null);
  const [plotWidth,setPlotWidth]=useState(760);
  useEffect(()=>{
    const element=plot.current;if(!element)return;
    const observer=new ResizeObserver(([entry])=>setPlotWidth(Math.max(240,Math.round(entry.contentRect.width))));
    observer.observe(element);return()=>observer.disconnect();
  },[view]);
  if (!seasons.length) return null;
  const index = Math.max(0, seasons.findIndex(season=>season.year===selectedYear));
  const selected = seasons[index];
  const metrics: {id:SeasonMetric; label:string}[] = [{id:'wins',label:'Victorias'},{id:'rate',label:'Efectividad'},{id:'titles',label:'Títulos'}];
  const value = (season: CareerSeason) => metric==='rate' ? season.played ? season.wins / season.played * 100 : 0 : season[metric];
  const max = metric==='rate' ? 100 : Math.max(1,...seasons.map(value));
  const x = (i:number)=>30+i/Math.max(1,seasons.length-1)*(plotWidth-60);
  const y = (n:number)=>202-n/max*160;
  const points=seasons.map((season,i)=>[x(i),y(value(season))]);
  const path=points.map(([px,py],i)=>(i?'L':'M')+px.toFixed(1)+' '+py.toFixed(1)).join(' ');
  const rank=ranking.find(point=>point.year===selected.year)?.rank;
  const sortValue=(season:CareerSeason)=>sort.key==='rate'?(season.played?season.wins/season.played:0):season[sort.key];
  const sortedSeasons=[...seasons].sort((a,b)=>(sortValue(a)-sortValue(b))*(sort.descending?-1:1)||b.year-a.year);
  const columns:{key:SeasonSort;label:string;short:string}[]=[{key:'year',label:'Año',short:'Año'},{key:'wins',label:'Victorias',short:'V'},{key:'losses',label:'Derrotas',short:'D'},{key:'titles',label:'Títulos',short:'T'},{key:'rate',label:'Efectividad',short:'%'}];

  const change = (direction:number) => setYear(seasons[Math.max(0,Math.min(seasons.length-1,index+direction))].year);
  const pick = (clientX:number) => {
    const rect=plot.current?.getBoundingClientRect();
    if(!rect)return;
    const normalized=Math.max(0,Math.min(1,((clientX-rect.left)/rect.width*plotWidth-30)/(plotWidth-60)));
    setYear(seasons[Math.round(normalized*(seasons.length-1))].year);
  };
  return <div className={styles.seasonExplorer}>
    <div className={styles.seasonHeading}><h2>Temporada a temporada.</h2>
      <div className={styles.seasonView} role="group" aria-label="Vista de temporadas">
        <button type="button" aria-pressed={view==='chart'} onClick={()=>setView('chart')}>Gráfica</button>
        <button type="button" aria-pressed={view==='table'} onClick={()=>setView('table')}>Tabla</button>
      </div>
      <label className={styles.seasonViewSelect}><span className={styles.sr}>Vista de temporadas</span><select aria-label="Vista de temporadas" value={view} onChange={event=>setView(event.target.value as 'chart'|'table')}><option value="chart">Gráfica</option><option value="table">Tabla</option></select><ChevronDown size={13} aria-hidden="true"/></label>
    </div>
    {view==='chart'?<>
      <div className={styles.seasonSnapshot} aria-live="polite" aria-atomic="true">
        <div className={styles.snapshotYear}><div className={styles.rankReading} data-rank={rank}><strong>{rank!==undefined?'N.º '+number(rank):'—'}</strong><span>Mejor ranking<span className={styles.rankSeason}>{selected.year}</span></span></div></div>
        <div className={styles.seasonKeyMetric}><strong>{number(value(selected),metric==='rate'?1:0)}{metric==='rate'?' %':''}</strong><span>{metrics.find(item=>item.id===metric)?.label}</span></div>
      </div>
      <div className={styles.seasonChart}>
        <div ref={plot} className={styles.plot} tabIndex={0} role="slider" aria-label="Temporada consultada" aria-valuemin={seasons[0].year} aria-valuemax={seasons.at(-1)!.year} aria-valuenow={selected.year} aria-valuetext={selected.year+', '+number(value(selected),1)+(metric==='rate'?' %':' '+metrics.find(item=>item.id===metric)?.label.toLowerCase())}
          onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();change(event.key==='ArrowLeft'?-1:1)}else if(event.key==='Home'){event.preventDefault();setYear(seasons[0].year)}else if(event.key==='End'){event.preventDefault();setYear(seasons.at(-1)!.year)}}}
          onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);pick(event.clientX)}}
          onPointerMove={event=>{if(event.pointerType==='mouse'||event.currentTarget.hasPointerCapture(event.pointerId))pick(event.clientX)}}
          onPointerUp={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}}
          onPointerCancel={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}}>
          <svg viewBox={`0 0 ${plotWidth} 224`} width={plotWidth} height="224" aria-hidden="true">
            {[0,.5,1].map(fraction=><text key={fraction} x="22" y={y(max*fraction)+3} textAnchor="end" fill="oklch(from #5d6e65 l c var(--appearance-hue,162.376))" fontSize="10">{number(max*fraction,metric==='rate'?0:undefined)}</text>)}
            <defs><linearGradient id={selectId+'-shade'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="oklch(from #17774b l c var(--appearance-hue,157.600))" stopOpacity=".2"/><stop offset="100%" stopColor="oklch(from #17774b l c var(--appearance-hue,157.600))" stopOpacity="0"/></linearGradient></defs>
            <path d={path+' L '+x(seasons.length-1)+' 222 L 30 222 Z'} fill={'url(#'+selectId+'-shade)'}/>
            <path d={path} fill="none" stroke="oklch(from #17774b l c var(--appearance-hue,157.600))" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
            <path d={'M '+x(index)+' 20 V 222'} fill="none" stroke="oklch(from #17774b l c var(--appearance-hue,157.600))" strokeDasharray="3 6" strokeOpacity=".5"/>
            <circle cx={x(index)} cy={y(value(selected))} r="6" fill="oklch(from #17774b l c var(--appearance-hue,157.600))" stroke="#fff" strokeWidth="3"/>
            {seasons.map((season,i)=><circle key={season.year} cx={x(i)} cy={y(value(season))} r="2" fill="oklch(from #17774b l c var(--appearance-hue,157.600))"/>)}
          </svg>
        </div>
        <div className={styles.chartYears} aria-hidden="true"><span>{seasons[0].year}</span><span>{seasons[Math.floor((seasons.length-1)/2)].year}</span><span>{seasons.at(-1)!.year}</span></div>
      </div>
      <div className={styles.metricSwitch} role="group" aria-label="Estadística de la gráfica">{metrics.map(item=><button key={item.id} type="button" aria-pressed={metric===item.id} onClick={()=>setMetric(item.id)}>{item.label}</button>)}</div>
    </>:<div className={styles.seasonTableView} role="region" aria-label="Tabla de temporadas" tabIndex={0}>
      <table>
        <caption className={styles.sr}>Resultados por temporada. Selecciona un encabezado para ordenar o un año para abrir su gráfica.</caption>
        <colgroup><col className={styles.yearColumn}/><col/><col/><col/><col className={styles.rateColumn}/></colgroup>
        <thead><tr>{columns.map(column=><th key={column.key} scope="col" aria-sort={sort.key===column.key?(sort.descending?'descending':'ascending'):'none'}>
          <button type="button" aria-label={'Ordenar por '+column.label.toLowerCase()} onClick={()=>setSort(current=>({key:column.key,descending:current.key===column.key?!current.descending:true}))}>
            <span className={styles.fullColumnLabel}>{column.label}</span><abbr className={styles.shortColumnLabel} title={column.label}>{column.short}</abbr>
            {sort.key===column.key&&(sort.descending?<ArrowDown size={12} aria-hidden="true"/>:<ArrowUp size={12} aria-hidden="true"/>)}
          </button>
        </th>)}</tr></thead>
        <tbody>{sortedSeasons.map(season=>{
          const rate=season.played?season.wins/season.played*100:0;
          return <tr key={season.year} data-selected={season.year===selected.year||undefined}>
            <th scope="row"><button type="button" aria-label={'Ver temporada '+season.year} onClick={()=>{setYear(season.year);setView('chart')}}>{season.year}</button></th>
            <td className={styles.tableWins}>{number(season.wins)}</td><td>{number(season.losses)}</td><td className={season.titles?styles.tableTitles:undefined}>{number(season.titles)}</td>
            <td><div className={styles.tableRate}><i aria-hidden="true" style={{width:rate+'%'}}/><span>{number(rate,1)} %</span></div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>}
  </div>;
}
