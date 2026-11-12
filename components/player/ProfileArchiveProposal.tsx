'use client';

import Image from 'next/image';
import Link from '@/components/IntentLink';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Trophy, SlidersHorizontal } from 'lucide-react';
import PlayerFlag from '@/components/PlayerFlag';
import PlayerAvatarView, { type PlayerAvatarPhoto } from '@/components/PlayerAvatarView';
import { MatchScoreboard } from '@/components/deuce/MatchScoreboard';
import { ProfileProposalMotion } from './ProfileProposalInteractive';
import type { CareerEdition } from '@/lib/player-tournament-history';
import type { RecentMatch, RivalCard } from './PlayerProfileInteractive';
import { imageFocus } from '@/lib/image-focus';
import {careerSeasonPosition} from '@/lib/presentation-calendar';
import {isCurrentTournament} from '@/lib/tournament-calendar-status';
import { number } from '@/lib/cuaderno/model';
import styles from '@/app/players/player-profile-proposal.module.css';

export type ProfileArchiveImage={src:string;alt:string;objectPosition?:string;mobileObjectPosition?:string};
export type ProfileTournament={slug:string;name:string;category:string;seasonPosition?:number;titles:number;titleYears:number[];href?:string;logo?:string;logoTone?:'white'|'circuit'|'color';trophy?:string;photo:ProfileArchiveImage|null;wins:number;played:number;participations:number;editions:CareerEdition[]};
export type ProfileRival=RivalCard&{avatar:PlayerAvatarPhoto|null};

function CategoryControl({label,value,onChange,options}:{label:string;value:string;onChange:(value:string)=>void;options:{value:string;label:string}[]}){
  return <label className={styles.archiveSelect} data-active={value!=='all'&&value!=='frequent'||undefined} title={label+': '+options.find(item=>item.value===value)?.label}><span className={styles.sr}>{label}</span><select aria-label={label} value={value} onChange={event=>onChange(event.target.value)}>{options.map(item=><option value={item.value} key={item.value}>{item.label}</option>)}</select><SlidersHorizontal size={16} aria-hidden="true"/></label>;
}

function TournamentShelf({tournaments}:{tournaments:ProfileTournament[]}){
  const [category,setCategory]=useState('all');
  const [chosen,setChosen]=useState(tournaments[0]?.slug);
  const choose=(slug:string)=>setChosen(slug);
  const categories=[...new Set(tournaments.map(item=>item.category))];
  const visible=tournaments.filter(item=>category==='all'||item.category===category);
  const selected=visible.find(item=>item.slug===chosen)||visible[0];
  if(!tournaments.length)return null;
  return <section id="torneos" className={styles.archiveSection+' '+styles.palmaresSection} aria-labelledby="proposal-tournaments-title">
    <div className={styles.palmaresAtmosphere} aria-hidden="true"/>
    <div className={styles.sectionHeading}><h2 id="proposal-tournaments-title">Torneos y palmarés.</h2><CategoryControl label="Categoría del palmarés" value={category} onChange={setCategory} options={[{value:'all',label:'Todas'},...categories.map(value=>({value,label:value}))]}/></div>
    {selected&&<div className={styles.trophyLayout}>
      <div className={styles.trophyLedger}>
        <div className={styles.trophyRows} role="group" aria-label="Elegir torneo del palmarés">
          {visible.map(item=><button type="button" aria-pressed={selected.slug===item.slug} key={item.slug} onClick={()=>choose(item.slug)}>
            <span className={styles.ledgerLogo} data-tone={item.logoTone}>{item.logo?<Image src={item.logo} alt="" width={36} height={36} unoptimized/>:<Trophy size={23} aria-hidden="true"/>}</span><span><strong>{item.name}</strong><small>{item.category}</small></span><span className={styles.ledgerTitleCount}>{item.trophy?<Image src={item.trophy} alt="" width={20} height={27} unoptimized/>:<Trophy size={18} aria-hidden="true"/>}<b>{number(item.titles)}</b></span><span className={styles.sr}> títulos</span>
          </button>)}
        </div>
      </div>
      <label className={styles.mobileTournamentPicker}><span>Elegir torneo</span><select aria-label="Elegir campeonato del palmarés" value={selected.slug} onChange={event=>choose(event.target.value)}>{visible.map(item=><option key={item.slug} value={item.slug}>{item.name}</option>)}</select><ChevronDown size={16} aria-hidden="true"/></label><article className={styles.trophySpotlight} data-photo={Boolean(selected.photo)||undefined}>
        {selected.photo&&<div className={styles.trophyPhoto} data-profile-scene=""><Image fill src={selected.photo.src} alt={selected.photo.alt} sizes="(max-width:759px) 100vw, 470px" style={imageFocus(selected.photo.objectPosition||'center',selected.photo.mobileObjectPosition||selected.photo.objectPosition||'center')}/></div>}
        <div className={styles.trophyCopy}>
          <div className={styles.trophyIdentity}>{selected.logo&&<Image src={selected.logo} width={42} height={42} alt="" unoptimized className={styles.spotlightLogo} data-tone={selected.logoTone}/>}<div><h3>{selected.href?<Link href={selected.href}>{selected.name}</Link>:selected.name}</h3><label className={styles.tournamentPicker}><strong aria-hidden="true">{selected.name}</strong><ChevronDown size={16} aria-hidden="true"/><select aria-label="Elegir torneo del palmarés" value={selected.slug} onChange={event=>choose(event.target.value)}>{visible.map(item=><option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label><p>{selected.category}<span className={styles.pickerCount}> · {visible.length} torneos <ChevronDown size={12} aria-hidden="true"/></span></p></div></div>
          <div className={styles.trophyOverview}>
            <p className={styles.titleCount}>{selected.trophy?<Image src={selected.trophy} width={55} height={72} alt="" unoptimized/>:<Trophy size={44} aria-hidden="true"/>}<span><strong>{number(selected.titles)}</strong><span className={styles.titleCaption}>Títulos</span></span></p>
            <dl><div><dt>Participaciones</dt><dd>{number(selected.participations)}</dd></div><div><dt>Balance V–D</dt><dd>{number(selected.wins)}–{number(selected.played-selected.wins)}</dd></div></dl>
            {selected.href&&<Link className={styles.trophyVisit} href={selected.href} aria-label={'Ver torneo: '+selected.name}><span>Ver torneo</span> <ArrowUpRight size={17} aria-hidden="true"/></Link>}
          </div>
        </div>
      </article>
    </div>}

  </section>;
}

function RivalLedger({rivals,playerName}:{rivals:ProfileRival[];playerName:string}){
  const [order,setOrder]=useState('frequent');
  const [expanded,setExpanded]=useState(false);
  const list=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(expanded)list.current?.querySelectorAll<HTMLAnchorElement>('a')[6]?.focus()},[expanded]);
  const ordered=[...rivals].sort((a,b)=>order==='frequent'?b.played-a.played:order==='best'?b.won/b.played-a.won/a.played:a.won/a.played-b.won/b.played);
  const visible=ordered.slice(0,expanded?12:6);
  if(rivals.length<2)return null;
  return <section id="enfrentamientos" className={styles.archiveSection} aria-labelledby="proposal-rivals-title">
    <div className={styles.sectionHeading}><h2 id="proposal-rivals-title">Rivales y enfrentamientos.</h2><CategoryControl label="Ordenar rivales" value={order} onChange={setOrder} options={[{value:'frequent',label:'Más enfrentados'},{value:'best',label:'Mejor balance'},{value:'worst',label:'Peor balance'}]}/></div>
    <div className={styles.rivalLedger}>
      <div ref={list} className={styles.rivalList} id="proposal-rival-list">
      {visible.map(rival=><Link key={rival.name} href={rival.href} className={styles.rivalEntry}
        aria-label={rival.name+': '+rival.won+' victorias y '+(rival.played-rival.won)+' derrotas de '+playerName+'. Ver cara a cara'}>
        <span className={styles.rivalPortrait}><PlayerAvatarView name={rival.name} photo={rival.avatar} size={64}/></span>
        <span className={styles.rivalDetail}>
          <span className={styles.rivalName}>{rival.country&&<PlayerFlag code={rival.country}/>}<strong>{rival.name}</strong></span>
          <span className={styles.rivalResult}><span><b>{rival.won}</b> {rival.won===1?'victoria':'victorias'}</span><i aria-hidden="true">·</i><span>{rival.played-rival.won} {rival.played-rival.won===1?'derrota':'derrotas'}</span></span>
        </span>
        <ArrowUpRight size={17} aria-hidden="true"/>
      </Link>)}
      </div>
      {!expanded&&ordered.length>6&&<button type="button" className={styles.moreRivals} aria-controls="proposal-rival-list" onClick={()=>setExpanded(true)}>Ver más rivales <ChevronDown size={17} aria-hidden="true"/></button>}
    </div>
  </section>;
}

function RecentArchive({matches}:{matches:RecentMatch[]}){
  const [filter,setFilter]=useState('all');const [limit,setLimit]=useState(6);
  const visible=matches.filter(item=>filter==='all'||filter==='wins'&&item.won||filter==='losses'&&!item.won||filter==='slams'&&item.record.category==='Grand Slam');
  return <section id="partidos" className={styles.archiveSection} aria-labelledby="proposal-matches-title">
    <div className={styles.sectionHeading}><h2 id="proposal-matches-title">Últimos partidos.</h2><CategoryControl label="Filtrar últimos partidos" value={filter} onChange={value=>{setFilter(value);setLimit(6)}} options={[{value:'all',label:'Todos'},{value:'wins',label:'Victorias'},{value:'losses',label:'Derrotas'},{value:'slams',label:'Grand Slam'}]}/></div>
    {visible.length?<div className={styles.recentGrid}>{visible.slice(0,limit).map(item=><MatchScoreboard key={item.record.id} match={item.record}/>)}</div>:<p className={styles.archiveEmpty}>No hay partidos de esta selección entre los últimos {matches.length} encuentros.</p>}
    {visible.length>limit&&<button type="button" className={styles.moreMatches} onClick={()=>setLimit(visible.length)}>Ver todos los partidos recientes <ChevronDown size={17} aria-hidden="true"/></button>}
  </section>;
}

function TournamentHistory({tournaments,tour}:{tournaments:ProfileTournament[];tour:'atp'|'wta'}){
  const categories=[...new Set(tournaments.flatMap(item=>item.editions.map(edition=>edition.category)))];
  const [category,setCategory]=useState(categories.includes('Grand Slam')?'Grand Slam':categories[0]);
  const visible=tournaments.filter(item=>item.editions.some(edition=>edition.category===category)).sort((a,b)=>Number(isCurrentTournament(b.name,tour,category)||category==='Grand Slam')-Number(isCurrentTournament(a.name,tour,category)||category==='Grand Slam')||careerSeasonPosition(a.name,a.seasonPosition)-careerSeasonPosition(b.name,b.seasonPosition)||a.name.localeCompare(b.name,'es'));
  const years=[...new Set(visible.flatMap(item=>item.editions.filter(edition=>edition.category===category).map(edition=>edition.year)))].sort((a,b)=>a-b);
  const [year,setYear]=useState<number|undefined>();
  const [windowFrom,setWindowFrom]=useState<number|undefined>();
  const selected=years.includes(year!)?year!:years.at(-1);
  const index=years.indexOf(selected!);
  const windowStart=Math.max(0,Math.min(Math.max(0,years.length-6),windowFrom??years.length-6));
  const windowYears=years.slice(windowStart,windowStart+6);
  if(!years.length)return null;
  const controls=<div className={styles.historyYears}>
    <button type="button" aria-label="Año anterior del historial" disabled={index<=0} onClick={()=>setYear(years[index-1])}><ChevronLeft size={17} aria-hidden="true"/></button>
    <strong aria-live="polite">{selected}</strong>
    <button type="button" aria-label="Año siguiente del historial" disabled={index===years.length-1} onClick={()=>setYear(years[index+1])}><ChevronRight size={17} aria-hidden="true"/></button>
  </div>;
  return <section className={styles.archiveSection} aria-labelledby="proposal-history-title">
    <div className={styles.sectionHeading}><h2 id="proposal-history-title">Su recorrido en torneos.</h2><CategoryControl label="Categoría del historial" value={category} onChange={value=>{setCategory(value);setYear(undefined);setWindowFrom(undefined)}} options={categories.map(value=>({value,label:value}))}/></div>
    <div className={styles.historyBoard}>
      <div className={styles.historyDesktop} role="region" aria-label="Historial de resultados por torneo y temporada" tabIndex={0}>
        <table><caption className={styles.sr}>Rondas documentadas. El guion indica que no hay un resultado registrado en esa edición.</caption>
          <thead><tr><th scope="col">Torneo</th>{windowYears.map(value=><th scope="col" key={value}><div className={styles.historyColumnYear}><span>{value}</span></div></th>)}</tr></thead>
          <tbody>{visible.map(item=><tr key={item.slug}><th scope="row">{item.logo&&<Image src={item.logo} width={27} height={27} alt="" unoptimized data-tone={item.logoTone}/>}<span>{item.name}{category!=='Grand Slam'&&!isCurrentTournament(item.name,tour,category)&&<small className={styles.historicalNote}>Etapa histórica</small>}</span></th>{windowYears.map(value=>{const entry=item.editions.find(edition=>edition.year===value&&edition.category===category);return <td key={value}><span className={styles.historyOutcome} data-outcome={entry?.outcome} title={entry?`${item.name} ${value}: ${entry.label}`:`${item.name} ${value}: sin resultado registrado`} aria-label={entry?.label||'Sin resultado registrado'}>{entry?.outcome==='title'?entry.label:entry?.code||'—'}</span></td>})}</tr>)}</tbody>
        </table>
      </div>
      <p className={styles.historyCategory}>{category}</p><div className={styles.historyMobile} aria-live="polite">{visible.filter(item=>category==='Grand Slam'||item.editions.some(edition=>edition.category===category&&edition.year===selected)).map(item=>{const entry=item.editions.find(edition=>edition.year===selected&&edition.category===category);return <div key={item.slug}>{item.logo&&<Image src={item.logo} width={27} height={27} alt="" unoptimized data-tone={item.logoTone}/>}<span>{item.name}{category!=='Grand Slam'&&!isCurrentTournament(item.name,tour,category)&&<small className={styles.historicalNote}>Etapa histórica</small>}</span><strong className={styles.historyOutcome} data-outcome={entry?.outcome}>{entry?.label||'—'}</strong></div>})}</div>
      <label className={styles.historyRange}><span className={styles.rangeCaption}><span>Recorrer temporadas</span><strong>{windowYears[0]}–{windowYears.at(-1)}</strong></span><input type="range" min={0} max={Math.max(0,years.length-6)} value={windowStart} onChange={event=>setWindowFrom(Number(event.target.value))} aria-valuetext={String(windowYears[0])+" a "+String(windowYears.at(-1))}/></label><div className={styles.historyToolbar}>{controls}</div>
    </div>
  </section>;
}

export default function ProfileArchiveProposal({tournaments,rivals,matches,playerName,tour}:{tournaments:ProfileTournament[];rivals:ProfileRival[];matches:RecentMatch[];playerName:string;tour:'atp'|'wta'}){
  return <ProfileProposalMotion className={styles.archiveChapters}><TournamentShelf tournaments={tournaments.filter(item=>item.titles>0)}/><TournamentHistory tournaments={tournaments} tour={tour}/><RivalLedger rivals={rivals} playerName={playerName}/><RecentArchive matches={matches}/></ProfileProposalMotion>;
}
