import Link from 'next/link';
import { ArrowUpRight, Trophy } from 'lucide-react';
import { notFound, permanentRedirect } from 'next/navigation';
import PlayerFlag from '@/components/PlayerFlag';
import PlayerFingerprint from '@/components/nocturno/PlayerFingerprint';
import PlayerPortrait from '@/components/PlayerPortrait';
import {
  PlayerCareerTimeline,
  PlayerProfileNav,
  PlayerRecentMatches,
  PlayerRivals,
  PlayerSeasonCalendar,
  type CalendarItem,
  type CareerSeason,
  type RecentMatch,
  type RivalCard,
} from '@/components/player/PlayerProfileInteractive';
import { toMatchRecord } from '@/data/map-match';
import { notebook } from '@/lib/cuaderno/data';
import { number, surfaceLabel } from '@/lib/cuaderno/model';
import { chronological, playerSeason, roundLabel, roundPosition, winnerName } from '@/lib/editorial';
import { pairSlug, playerSlug } from '@/lib/explore';
import { tournamentName } from '@/lib/labels';
import { canonicalName } from '@/lib/quality';
import { playerPhoto } from '@/lib/player-imagery';
import { countryLabel, handLabel, backhandLabel, playerBiography } from '@/lib/player-bio';
import { tournamentDirectory } from '@/lib/tournament-directory';
import type { Match } from '@/lib/types';
import { SURFACES } from '@/lib/surface';

type Props={params:Promise<{slug:string}>;searchParams:Promise<{year?:string}>};

function categoryPriority(category:string){
  if(category==='Grand Slam')return 0;
  if(category==='Masters 1000'||category==='Precursores de Masters')return 1;
  if(category==='ATP 500')return 2;
  if(category==='ATP 250')return 3;
  return 4;
}

function bestRanking(matches:Match[],name:string){
  return matches.flatMap(match=>{
    if(match.context?.rankLabel!=='Ranking al jugar')return [];
    const rank=match.player1.name===name?match.context.rank1:match.context.rank2;
    return rank&&rank>0?[{rank,year:match.year}]:[];
  }).sort((a,b)=>a.rank-b.rank||a.year-b.year)[0];
}

function RankingHistory({matches,name}:{matches:Match[];name:string}){
  const yearly=new Map<number,number>();
  for(const match of matches){
    if(match.context?.rankLabel!=='Ranking al jugar')continue;
    const rank=match.player1.name===name?match.context.rank1:match.context.rank2;
    if(rank&&rank>0)yearly.set(match.year,Math.min(yearly.get(match.year)||Infinity,rank));
  }
  const points=[...yearly].sort((a,b)=>a[0]-b[0]);
  if(!points.length)return <section className="pp-section pp-ranking" aria-labelledby="pp-ranking-title"><div className="pp-section-heading"><div><span>Posición en el circuito</span><h2 id="pp-ranking-title">Evolución del ranking</h2></div></div><div className="pp-empty"><strong>Sin evolución disponible</strong><p>No hay evolución del ranking disponible para este jugador.</p></div></section>;
  const first=points[0][0],last=points.at(-1)![0],width=Math.max(620,(last-first+1)*58),height=230,pad={left:48,right:25,top:28,bottom:42};
  const maximum=Math.max(10,...points.map(([,rank])=>rank));
  const x=(year:number)=>pad.left+(last===first?0:(year-first)*(width-pad.left-pad.right)/(last-first));
  const y=(rank:number)=>pad.top+((rank-1)/Math.max(1,maximum-1))*(height-pad.top-pad.bottom);
  const best=points.reduce((current,point)=>point[1]<current[1]?point:current,points[0]);
  const sequences=points.reduce<Array<Array<[number,number]>>>((groups,point)=>{const current=groups.at(-1);if(!current||point[0]-current.at(-1)![0]>1)groups.push([point]);else current.push(point);return groups;},[]);
  return <section className={`pp-section pp-ranking${points.length<3?' is-short':''}`} aria-labelledby="pp-ranking-title">
    <div className="pp-section-heading"><div><span>Posición en el circuito</span><h2 id="pp-ranking-title">Evolución del ranking</h2></div><p><strong>n.º {number(best[1])}</strong><span>mejor posición · {best[0]}</span></p></div>
    <div className="pp-ranking-scroll" tabIndex={0} aria-label="Gráfica desplazable de la evolución del ranking"><svg viewBox={`0 0 ${width} ${height}`} style={{minWidth:`${width}px`}} role="img" aria-label={points.map(([year,rank])=>`${year}: puesto ${rank}`).join('. ')}>
      {[1,Math.max(2,Math.round(maximum/2)),maximum].map(rank=><g key={rank}><line x1={pad.left} x2={width-pad.right} y1={y(rank)} y2={y(rank)} /><text x={pad.left-10} y={y(rank)+4} textAnchor="end">{rank}</text></g>)}
      {sequences.map((sequence,index)=>sequence.length>1&&<path key={index} d={sequence.map(([year,rank],pointIndex)=>`${pointIndex?'L':'M'}${x(year)},${y(rank)}`).join(' ')}/>)}
      {points.map(([year,rank])=><g className={year===best[0]&&rank===best[1]?'is-best':''} key={year}><title>{`${year}: puesto ${rank}`}</title><circle cx={x(year)} cy={y(rank)} r={year===best[0]&&rank===best[1]?7:5}/><text x={x(year)} y={height-12} textAnchor="middle">{year}</text></g>)}
    </svg></div>
    {points.length<3&&<p className="pp-data-note">Serie reducida: hay {number(points.length)} {points.length===1?'registro':'registros'} de ranking disponible.</p>}
  </section>;
}

export async function generateMetadata({params,searchParams}:Props){
  const {slug}=await params,query=await searchParams;
  const player=(await notebook()).players.find(entry=>playerSlug(entry.name)===slug);
  const title=`${player?.name||'Jugador'} — DEUCE`;
  const description=player?`${player.name}: carrera, rendimiento, temporadas, rivales y partidos en el archivo DEUCE.`:'Resultados de los torneos ATP guardados en DEUCE.';
  return {title,description,alternates:{canonical:`/jugadores/${slug}${query.year?`?year=${query.year}`:''}`},openGraph:{title,description,type:'profile',url:`/jugadores/${slug}`},twitter:{card:'summary_large_image',title,description}};
}

export default async function Player({params,searchParams}:Props){
  const {slug}=await params,query=await searchParams,data=await notebook();
  const player=data.players.find(entry=>playerSlug(entry.name)===playerSlug(canonicalName(slug.replace(/-/g,' '))));
  if(!player)notFound();
  if(playerSlug(player.name)!==slug)permanentRedirect(`/jugadores/${playerSlug(player.name)}`);
  const record=data.records.find(entry=>entry.name===player.name);
  if(!record)notFound();

  const portrait=playerPhoto(player.name),bio=playerBiography(player.name);
  const years=[...new Set(player.matches.map(match=>match.year))].sort((a,b)=>b-a);
  const latestYear=years[0],firstYear=years.at(-1)!;
  const archiveYear=data.matches.reduce((maximum,match)=>Math.max(maximum,match.year),0);
  const status=latestYear>=archiveYear-1?'En activo':'Retirado';
  const selectedYear=years.includes(Number(query.year))?Number(query.year):latestYear;
  const rank=bestRanking(player.matches,player.name);
  const winRate=player.played?player.won/player.played*100:0;
  const gsMatches=player.matches.filter(match=>match.category==='Grand Slam');
  const gsWins=gsMatches.filter(match=>winnerName(match)===player.name).length;

  const seasonMap=new Map<number,{wins:number;losses:number;titles:number;played:number}>();
  for(const match of player.matches){
    const season=seasonMap.get(match.year)||{wins:0,losses:0,titles:0,played:0};
    season.played++;
    if(winnerName(match)===player.name){season.wins++;if(roundPosition(match.round)===7)season.titles++;}else season.losses++;
    seasonMap.set(match.year,season);
  }
  const careerSeasons:CareerSeason[]=[...seasonMap].sort((a,b)=>a[0]-b[0]).map(([year,season])=>({year,...season}));
  const bestSeason=[...careerSeasons].sort((a,b)=>b.wins-a.wins||b.titles-a.titles)[0];
  const balancedSeason=[...careerSeasons].filter(season=>season.played>=5).sort((a,b)=>Math.abs(a.wins/a.played-.5)-Math.abs(b.wins/b.played-.5))[0];

  const surfaceRows=SURFACES.flatMap(surface=>{const value=player.bySurface[surface];return value.played?[{key:surface,label:surfaceLabel[surface],played:value.played,wins:value.won,losses:value.played-value.won,rate:value.won/value.played*100}]:[];}).sort((a,b)=>b.played-a.played);
  const reliableSurfaces=surfaceRows.filter(surface=>surface.played>=10);
  const bestSurface=[...(reliableSurfaces.length?reliableSurfaces:surfaceRows)].sort((a,b)=>b.rate-a.rate||b.played-a.played)[0];

  const directory=new Map(tournamentDirectory(data.matches).map(entry=>[entry.name,entry]));
  const tournaments=[...new Set(player.matches.map(match=>match.tournament))].flatMap(name=>{
    const matches=player.matches.filter(match=>match.tournament===name);
    if(!matches.length)return [];
    const finalMatches=matches.filter(match=>roundPosition(match.round)===7);
    const titles=finalMatches.filter(match=>winnerName(match)===player.name).length;
    const best=[...matches].sort((a,b)=>roundPosition(b.round)-roundPosition(a.round)||Number(winnerName(b)===player.name)-Number(winnerName(a)===player.name)||b.year-a.year)[0];
    const bestResult=roundPosition(best.round)===7&&winnerName(best)===player.name?'Campeón':roundLabel(best.round);
    const latest=[...matches].sort((a,b)=>b.year-a.year)[0];
    return [{name:tournamentName(name),slug:directory.get(name)?.slug||playerSlug(name),surface:surfaceLabel[latest.surface],surfaceKey:latest.surface,category:latest.category||'Sin categoría registrada',played:matches.length,wins:matches.filter(match=>winnerName(match)===player.name).length,finals:finalMatches.length,titles,participations:new Set(matches.map(match=>match.year)).size,bestResult,bestYear:best.year}];
  }).sort((a,b)=>categoryPriority(a.category)-categoryPriority(b.category)||b.titles-a.titles||b.wins-a.wins);

  const rivalRows=[...player.matches.reduce((map,match)=>{
    const opponent=match.player1.name===player.name?match.player2.name:match.player1.name;
    const current=map.get(opponent)||{name:opponent,matches:[] as Match[],won:0};
    current.matches.push(match);if(winnerName(match)===player.name)current.won++;
    map.set(opponent,current);return map;
  },new Map<string,{name:string;matches:Match[];won:number}>()).values()].filter(rival=>rival.matches.length>=2);
  const rivals:RivalCard[]=rivalRows.map(rival=>{
    const surface=[...rival.matches.reduce((map,match)=>map.set(match.surface,(map.get(match.surface)||0)+1),new Map<string,number>())].sort((a,b)=>b[1]-a[1])[0]?.[0];
    const last=[...rival.matches].sort((a,b)=>chronological(b,a))[0];
    return {name:rival.name,href:`/rivalries/${pairSlug(player.name,rival.name)}`,country:playerBiography(rival.name)?.country,played:rival.matches.length,won:rival.won,surface:surfaceLabel[surface as keyof typeof surfaceLabel]||'Sin superficie',last:String(last.year)};
  });
  const frequentRival=[...rivals].sort((a,b)=>b.played-a.played)[0];
  const participationLeader=[...tournaments].sort((a,b)=>b.participations-a.participations||b.played-a.played)[0];

  const metrics=[
    {value:number(player.played),label:'Partidos disputados',context:`${firstYear}–${latestYear}`},
    {value:`${number(player.won)}–${number(player.played-player.won)}`,label:'Victorias y derrotas',context:`${number(winRate,1)} % de efectividad`},
    {value:`${number(winRate,1)} %`,label:'Efectividad',context:`${number(player.won)} de ${number(player.played)} partidos`},
    record.finalsWon>0?{value:number(record.finalsWon),label:'Títulos',context:`${number(record.finalsPlayed)} finales registradas`}:null,
    record.finalsWon===0&&record.finalsPlayed>0?{value:number(record.finalsPlayed),label:'Finales',context:'Sin títulos registrados'}:null,
    rank?{value:`n.º ${number(rank.rank)}`,label:'Mejor ranking conocido',context:String(rank.year)}:null,
    {value:number(years.length),label:'Temporadas registradas',context:`Debut en el archivo: ${firstYear}`},
    gsMatches.length?{value:`${number(gsWins)}–${number(gsMatches.length-gsWins)}`,label:'Balance en Grand Slam',context:`${number(gsMatches.length)} partidos`}:null,
    record.extra.top10Played?{value:`${number(record.extra.top10Wins||0)}–${number(record.extra.top10Played-(record.extra.top10Wins||0))}`,label:'Balance ante el top 10',context:`${number(record.extra.top10Played)} partidos medidos`}:null,
  ].filter((item):item is {value:string;label:string;context:string}=>Boolean(item)).slice(0,8);

  const context=player.played<20?`Datos disponibles: ${number(player.played)} partidos registrados`:years.length>1?`${number(years.length)} temporadas en el archivo`:`Jugador registrado en ${latestYear}`;
  const insights=[
    bestSeason&&{label:'Mejor temporada',value:String(bestSeason.year),detail:`${number(bestSeason.wins)} victorias · ${number(bestSeason.titles)} títulos`},
    bestSurface&&{label:'Mejor superficie registrada',value:bestSurface.label,detail:`${number(bestSurface.rate,1)} % en ${number(bestSurface.played)} partidos${bestSurface.played<10?' · muestra pequeña':''}`},
    frequentRival&&{label:'Rival más frecuente',value:frequentRival.name,detail:`${number(frequentRival.played)} enfrentamientos`},
    record.longestWinStreak>1&&{label:'Mayor racha',value:number(record.longestWinStreak),detail:'victorias consecutivas'},
    participationLeader&&{label:'Más participaciones',value:participationLeader.name,detail:`${number(participationLeader.participations)} ediciones`},
  ].filter((item):item is {label:string;value:string;detail:string}=>Boolean(item)).slice(0,5);

  const calendarItems:CalendarItem[]=playerSeason(player.matches,player.name,selectedYear).filter(entry=>entry.last).map(entry=>{
    const match=entry.last!;
    const position=roundPosition(match.round),won=winnerName(match)===player.name;
    const outcomeKey=position===7&&won?'title':position===7?'final':position===6?'semifinal':position<=3?'early':'other';
    const outcome=outcomeKey==='title'?'Campeón':outcomeKey==='final'?'Finalista':outcomeKey==='semifinal'?'Semifinalista':roundLabel(match.round);
    return {name:tournamentName(entry.tournament),href:`/match/${match.match_id}`,outcome,outcomeKey,surface:surfaceLabel[match.surface],surfaceKey:match.surface,category:match.category,balance:`${number(entry.won)}–${number(entry.played-entry.won)} · ${number(entry.played)} partidos`};
  });

  const recent:RecentMatch[]=[...player.matches].sort((a,b)=>chronological(b,a)).slice(0,20).map(match=>({record:toMatchRecord(match),won:winnerName(match)===player.name,surface:surfaceLabel[match.surface],opponent:match.player1.name===player.name?match.player2.name:match.player1.name}));
  const initials=player.name.split(/\s+/).map(part=>part[0]).slice(0,2).join('');

  return <div className="nc-wrap pp-page">
    <nav className="pp-breadcrumb" aria-label="Ruta de navegación"><Link href="/jugadores">Jugadores</Link><span aria-hidden="true">/</span><span>{player.name}</span></nav>
    <header className={`pp-hero${portrait?' has-photo':' no-photo'}`} id="resumen">
      <div className="pp-hero-copy">
        <div className="pp-status-line">{bio?.country&&<span><PlayerFlag code={bio.country}/>{countryLabel(bio.country)}</span>}<span className={status==='En activo'?'is-active':''}>{status}</span></div>
        <h1>{player.name}</h1>
        <p className="pp-context">{context}</p>
        <dl className="pp-hero-facts"><div><dt>Actividad</dt><dd>{firstYear}–{latestYear}</dd></div>{bio?.hand&&<div><dt>Mano</dt><dd>{handLabel(bio.hand)}</dd></div>}{bio?.backhand&&<div><dt>Revés</dt><dd>{backhandLabel(bio.backhand)}</dd></div>}{rank&&<div><dt>Mejor ranking</dt><dd>n.º {number(rank.rank)}</dd></div>}</dl>
        <div className="pp-hero-actions"><Link className="pp-primary-action" href={`/comparar?a=${encodeURIComponent(player.name)}`}>Comparar jugador <ArrowUpRight size={17} aria-hidden="true"/></Link><Link className="pp-secondary-action" href={`/buscar?player=${encodeURIComponent(player.name)}`}>Ver todos sus partidos</Link></div>
      </div>
      {portrait?<PlayerPortrait photo={portrait} className="pp-hero-photo" preload/>:<div className="pp-hero-fallback" aria-label={`Sin fotografía disponible para ${player.name}`}><span>{initials}</span>{bio?.country&&<PlayerFlag code={bio.country}/>}<i/><i/></div>}
    </header>

    <PlayerProfileNav/>

    <main className="pp-content">
      <section className="pp-stat-summary" aria-label="Resumen estadístico">{metrics.map((metric,index)=><article key={metric.label} className={index<3?'is-primary':''}><strong>{metric.value}</strong><span>{metric.label}</span><small>{metric.context}</small></article>)}</section>

      <section className="pp-section pp-glance" aria-labelledby="pp-glance-title"><div className="pp-section-heading"><div><span>Lectura rápida</span><h2 id="pp-glance-title">La carrera en una mirada</h2></div></div>{insights.length?<div className="pp-insight-grid">{insights.map(insight=><article key={insight.label}><span>{insight.label}</span><strong>{insight.value}</strong><small>{insight.detail}</small></article>)}</div>:<div className="pp-empty"><strong>{number(player.played)} partidos en el archivo</strong><p>Aún no hay datos suficientes para generar más lecturas de carrera.</p></div>}</section>

      <section className="pp-section pp-performance" id="rendimiento" aria-labelledby="pp-performance-title"><div className="pp-section-heading"><div><span>Comparativa por pista</span><h2 id="pp-performance-title">Rendimiento por superficie</h2></div>{bestSurface&&<p><strong>{bestSurface.label}</strong><span>{bestSurface.played<10?'Mejor registro provisional':'Mejor rendimiento registrado'}</span></p>}</div>
        {surfaceRows.length?<div className="pp-surface-list">{surfaceRows.map(surface=><article key={surface.key} data-event-surface={surface.key}><div><span>{surface.label}</span><strong>{number(surface.rate,1)} %</strong></div><p><b>{number(surface.wins)}</b> victorias <i/> <b>{number(surface.losses)}</b> derrotas <small>{number(surface.played)} partidos{surface.played<10?' · muestra pequeña':''}</small></p><span className="pp-surface-track" aria-hidden="true"><i style={{width:`${surface.rate}%`}}/><i style={{width:`${100-surface.rate}%`}}/></span></article>)}</div>:<div className="pp-empty"><strong>No hay datos registrados</strong><p>No se puede comparar el rendimiento por superficie.</p></div>}
      </section>

      <div className="pp-advanced"><PlayerFingerprint player={record} archive={data.records}/></div>

      <section className="pp-section pp-seasons" id="temporadas" aria-labelledby="pp-seasons-title"><div className="pp-section-heading"><div><span>Ritmo de carrera</span><h2 id="pp-seasons-title">Evolución temporal</h2></div><div className="pp-season-highlights">{bestSeason&&<span><strong>{bestSeason.year}</strong> mejor temporada</span>}{balancedSeason&&balancedSeason.year!==bestSeason?.year&&<span><strong>{balancedSeason.year}</strong> temporada más equilibrada</span>}<span><strong>{latestYear}</strong> último registro</span></div></div><PlayerCareerTimeline seasons={careerSeasons}/></section>

      <RankingHistory matches={player.matches} name={player.name}/>

      <section className="pp-section pp-tournaments" id="torneos" aria-labelledby="pp-tournaments-title"><div className="pp-section-heading"><div><span>Participaciones y mejores resultados</span><h2 id="pp-tournaments-title">Torneos y palmarés</h2></div>{record.finalsWon>0?<p><strong>{number(record.finalsWon)} títulos</strong><span>{number(record.finalsPlayed)} finales</span></p>:<p><strong>Sin títulos registrados</strong><span>Mostramos sus mejores actuaciones</span></p>}</div>
        <div className="pp-tournament-list">{tournaments.slice(0,18).map(tournament=><Link key={tournament.slug} href={`/buscar?player=${encodeURIComponent(player.name)}&tournament=${tournament.slug}`} data-event-surface={tournament.surfaceKey}><span className="pp-tournament-category">{tournament.category}</span><strong>{tournament.name}</strong><span className="pp-tournament-result">{tournament.titles>0&&<Trophy size={17} aria-hidden="true"/>}{tournament.bestResult} · {tournament.bestYear}</span><small>{number(tournament.participations)} {tournament.participations===1?'participación':'participaciones'} · {number(tournament.wins)}–{number(tournament.played-tournament.wins)} · {tournament.surface}</small><ArrowUpRight size={16} aria-hidden="true"/></Link>)}</div>
      </section>

      <section className="pp-section pp-rivals" id="enfrentamientos" aria-labelledby="pp-rivals-title"><div className="pp-section-heading"><div><span>Cara a cara</span><h2 id="pp-rivals-title">Rivales y enfrentamientos</h2></div><Link href={`/jugadores?tipo=enfrentamientos&q=${encodeURIComponent(player.name)}`}>Ver todos</Link></div><PlayerRivals rivals={rivals}/></section>

      <section className="pp-section pp-calendar" aria-labelledby="pp-calendar-title"><div className="pp-section-heading"><div><span>Temporada seleccionada</span><h2 id="pp-calendar-title">Calendario de {selectedYear}</h2></div></div><PlayerSeasonCalendar items={calendarItems} years={years} currentYear={selectedYear} baseHref={`/jugadores/${slug}`}/></section>

      <section className="pp-section pp-matches" id="partidos" aria-labelledby="pp-matches-title"><div className="pp-section-heading"><div><span>Resultados del archivo</span><h2 id="pp-matches-title">Últimos partidos</h2></div><Link href={`/buscar?player=${encodeURIComponent(player.name)}`}>Todos sus partidos <ArrowUpRight size={15} aria-hidden="true"/></Link></div><PlayerRecentMatches matches={recent}/></section>
    </main>
  </div>;
}
