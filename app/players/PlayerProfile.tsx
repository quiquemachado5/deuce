import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { notFound, permanentRedirect } from 'next/navigation';
import PlayerFlag from '@/components/PlayerFlag';
import PlayerPortrait from '@/components/PlayerPortrait';
import {
  PlayerCareerTimeline,
  PlayerRankingSlider,
  PlayerProfileNav,
  PlayerRecentMatches,
  PlayerRivals,
  PlayerTournamentArchive,
  type CareerSeason,
  type RecentMatch,
  type RankingPoint,
  type RivalCard,
} from '@/components/player/PlayerProfileInteractive';
import { toMatchRecord } from '@/data/map-match';
import { playerNotebook } from '@/lib/cuaderno/data';
import { number, surfaceLabel } from '@/lib/cuaderno/model';
import { chronological, roundLabel, roundPosition, winnerName } from '@/lib/editorial';
import { pairSlug, playerSlug } from '@/lib/explore';
import { tournamentName } from '@/lib/labels';
import { courtPhoto, type Photo } from '@/lib/imagery';
import { playerDirectoryPhoto, playerEditionPhoto } from '@/lib/player-imagery';
import { handLabel, playerBiography } from '@/lib/player-bio';
import { tournamentDirectory } from '@/lib/tournament-directory';
import { tournamentBrandingFor } from '@/lib/tournament-branding';
import { championPhotos } from '@/lib/tournament-media';
import type { Match } from '@/lib/types';
import { SURFACES } from '@/lib/surface';
import styles from './player-profile.module.css';

type Props={params:Promise<{slug:string}>;searchParams:Promise<{year?:string}>};

function categoryPriority(category:string){
  if(category==='Grand Slam')return 0;
  if(category==='Masters 1000'||category==='Precursores de Masters')return 1;
  if(category==='ATP 500')return 2;
  if(category==='ATP 250')return 3;
  return 4;
}

function rankingHistoryPoints(matches:Match[],name:string){
  const yearly=new Map<number,number>();
  for(const match of matches){
    if(match.context?.rankLabel!=='Ranking al jugar')continue;
    const rank=match.player1.name===name?match.context.rank1:match.context.rank2;
    if(rank&&rank>0){
      yearly.set(match.year,Math.min(yearly.get(match.year)||Infinity,rank));
    }
  }
  return [...yearly].sort((a,b)=>a[0]-b[0]).map(([year,rank]):RankingPoint=>({year,rank}));
}

export async function generateMetadata({params,searchParams}:Props){
  const {slug}=await params,query=await searchParams;
  const player=(await playerNotebook(slug))?.player;
  const title=`${player?.name||'Jugador'} — DEUCE`;
  const description=player?`${player.name}: carrera, rendimiento, temporadas, rivales y partidos en el archivo DEUCE.`:'Resultados de los torneos ATP guardados en DEUCE.';
  return {title,description,alternates:{canonical:`/jugadores/${slug}${query.year?`?year=${query.year}`:''}`},openGraph:{title,description,type:'profile',url:`/jugadores/${slug}`},twitter:{card:'summary_large_image',title,description}};
}

export default async function Player({params}:Props){
  const {slug}=await params,data=await playerNotebook(slug);
  if(!data)notFound();
  const {player,record}=data;
  if(playerSlug(player.name)!==slug)permanentRedirect(`/jugadores/${playerSlug(player.name)}`);

  const portrait=playerDirectoryPhoto(player.name),bio=playerBiography(player.name);
  const years=[...new Set(player.matches.map(match=>match.year))].sort((a,b)=>b-a);
  const latestYear=years[0],firstYear=years.at(-1)!;
  const activityLabel=firstYear===latestYear?String(firstYear):`${firstYear}–${latestYear}`;
  const archiveYear=Math.max(...data.manifest.years);
  const status=latestYear>=archiveYear-1?'En activo':'Retirado';
  const winRate=player.played?player.won/player.played*100:0;
  const seasonMap=new Map<number,{wins:number;losses:number;titles:number;played:number}>();
  for(const match of player.matches){
    const season=seasonMap.get(match.year)||{wins:0,losses:0,titles:0,played:0};
    season.played++;
    if(winnerName(match)===player.name){season.wins++;if(roundPosition(match.round)===7)season.titles++;}else season.losses++;
    seasonMap.set(match.year,season);
  }
  const careerSeasons:CareerSeason[]=[...seasonMap].sort((a,b)=>a[0]-b[0]).map(([year,season])=>({year,...season}));
  const rankingPoints=rankingHistoryPoints(player.matches,player.name);
  const showCareerEvolution=careerSeasons.length>=2;
  const showSeasonAnalysis=showCareerEvolution||rankingPoints.length>0;
  const bestSeason=[...careerSeasons].sort((a,b)=>b.wins-a.wins||b.titles-a.titles)[0];

  const surfaceRows=SURFACES.flatMap(surface=>{const value=player.bySurface[surface];return value.played?[{key:surface,label:surfaceLabel[surface],played:value.played,wins:value.won,losses:value.played-value.won,rate:value.won/value.played*100}]:[];}).sort((a,b)=>b.played-a.played);
  const displayedSurfaceRows=surfaceRows.filter(surface=>surface.key==='hard'||surface.key==='clay'||surface.key==='grass');
  const reliableSurfaces=surfaceRows.filter(surface=>surface.played>=10);
  const bestSurface=[...(reliableSurfaces.length?reliableSurfaces:surfaceRows)].sort((a,b)=>b.rate-a.rate||b.played-a.played)[0];

  const directory=new Map(tournamentDirectory(data.matches).map(entry=>[entry.name,entry]));
  const tournaments=[...new Set(player.matches.map(match=>match.tournament))].flatMap(name=>{
    const matches=player.matches.filter(match=>match.tournament===name);
    if(!matches.length)return [];
    const finalMatches=matches.filter(match=>roundPosition(match.round)===7);
    const titleMatches=finalMatches.filter(match=>winnerName(match)===player.name);
    const titles=titleMatches.length;
    const titleYears=[...new Set(titleMatches.map(match=>match.year))].sort((a,b)=>a-b);
    const best=[...matches].sort((a,b)=>roundPosition(b.round)-roundPosition(a.round)||Number(winnerName(b)===player.name)-Number(winnerName(a)===player.name)||b.year-a.year)[0];
    const bestResult=roundPosition(best.round)===7&&winnerName(best)===player.name?'Campeón':roundLabel(best.round);
    const latest=[...matches].sort((a,b)=>b.year-a.year)[0];
    return [{name:tournamentName(name),rawName:name,slug:directory.get(name)?.slug||playerSlug(name),surface:surfaceLabel[latest.surface],surfaceKey:latest.surface,category:latest.category||'Sin categoría registrada',played:matches.length,wins:matches.filter(match=>winnerName(match)===player.name).length,finals:finalMatches.length,titles,titleYears,participations:new Set(matches.map(match=>match.year)).size,bestResult,bestYear:best.year}];
  }).sort((a,b)=>categoryPriority(a.category)-categoryPriority(b.category)||b.titles-a.titles||b.wins-a.wins);

  const rivalRows=[...player.matches.reduce((map,match)=>{
    const opponent=match.player1.name===player.name?match.player2.name:match.player1.name;
    const current=map.get(opponent)||{name:opponent,matches:[] as Match[],won:0};
    current.matches.push(match);if(winnerName(match)===player.name)current.won++;
    map.set(opponent,current);return map;
  },new Map<string,{name:string;matches:Match[];won:number}>()).values()].filter(rival=>rival.matches.length>=2);
  const rivals:RivalCard[]=rivalRows.map(rival=>{
    const surface=[...rival.matches.reduce((map,match)=>map.set(match.surface,(map.get(match.surface)||0)+1),new Map<string,number>())].sort((a,b)=>b[1]-a[1])[0]?.[0];
    return {name:rival.name,href:`/rivalries/${pairSlug(player.name,rival.name)}`,country:playerBiography(rival.name)?.country,played:rival.matches.length,won:rival.won,surface:surfaceLabel[surface as keyof typeof surfaceLabel]||'Sin superficie'};
  });
  const frequentRival=[...rivals].sort((a,b)=>b.played-a.played)[0];
  const participationLeader=[...tournaments].sort((a,b)=>b.participations-a.participations||b.played-a.played)[0];

  const achievementMetric=record.finalsWon>0
    ?{value:number(record.finalsWon),label:'Títulos',context:`${number(record.finalsPlayed)} finales registradas`}
    :record.finalsPlayed>0
      ?{value:number(record.finalsPlayed),label:'Finales',context:'Sin títulos registrados'}
      :{value:number(years.length),label:'Temporadas',context:activityLabel};
  const coreMetrics=[
    {value:number(player.won),label:'Victorias',context:`de ${number(player.played)} partidos`},
    {value:number(player.played-player.won),label:'Derrotas',context:`${number(100-winRate,1)} % de la muestra`},
    {value:`${number(winRate,1)} %`,label:'Efectividad',context:`${number(player.won)} de ${number(player.played)}`},
    achievementMetric,
  ];

  const surfaceImage=bestSurface?courtPhoto(bestSurface.key==='clay'?'Roland Garros':bestSurface.key==='grass'?'Wimbledon':'US Open'):null;
  const insights=[
    bestSeason&&{kind:'season',label:'Mejor temporada',value:String(bestSeason.year),detail:`${number(bestSeason.wins)} victorias · ${number(bestSeason.titles)} títulos`,photo:null},
    bestSurface&&{kind:'surface',label:'Mejor superficie registrada',value:bestSurface.label,detail:`${number(bestSurface.rate,1)} % en ${number(bestSurface.played)} partidos${bestSurface.played<10?' · muestra pequeña':''}`,photo:surfaceImage},
    frequentRival&&{kind:'rival',label:'Rival más frecuente',value:frequentRival.name,detail:`${number(frequentRival.played)} enfrentamientos`,photo:playerDirectoryPhoto(frequentRival.name)},
    record.longestWinStreak>1&&{kind:'streak',label:'Mayor racha',value:number(record.longestWinStreak),detail:'victorias consecutivas',photo:null},
    participationLeader&&{kind:'appearances',label:'Más participaciones',value:participationLeader.name,detail:`${number(participationLeader.participations)} ediciones`,photo:courtPhoto(participationLeader.rawName)},
  ].filter((item):item is {kind:string;label:string;value:string;detail:string;photo:Photo|null}=>Boolean(item)).slice(0,5);

  const galleryCandidates=[portrait,...Object.values(championPhotos).filter(photo=>photo.alt.includes(player.name)),playerEditionPhoto(player.name,1)].filter((photo):photo is Photo=>Boolean(photo));
  const galleryPhotos=[...new Map(galleryCandidates.map(photo=>[photo.src,photo])).values()].slice(0,3);

  const recent:RecentMatch[]=[...player.matches].sort((a,b)=>chronological(b,a)).slice(0,20).map(match=>({record:toMatchRecord(match),won:winnerName(match)===player.name,surface:surfaceLabel[match.surface],opponent:match.player1.name===player.name?match.player2.name:match.player1.name}));
  const initials=player.name.split(/\s+/).map(part=>part[0]).slice(0,2).join('');

  return <div className={`nc-wrap pp-page ${styles.profilePage}`}>
    <div className={styles.heroStage}>
      <header className={`pp-hero${portrait?' has-photo':' no-photo'}`} id="resumen">
        {portrait?<PlayerPortrait photo={portrait} className="pp-hero-photo" preload/>:<div className="pp-hero-fallback" aria-label={`Sin fotografía disponible para ${player.name}`}><span>{initials}</span>{bio?.country&&<PlayerFlag code={bio.country}/>}<i/><i/></div>}
        <div className={styles.heroShade} aria-hidden="true"/>
        <Link className={styles.backButton} href="/jugadores" aria-label="Volver a jugadores"><ArrowLeft size={19} aria-hidden="true"/></Link>
        <div className="pp-hero-copy">
          <div className={styles.heroIdentity}>
            <div className={styles.playerTitle}>{bio?.country&&<PlayerFlag code={bio.country}/>}<h1>{player.name}</h1></div>
            <dl className="pp-hero-facts"><div><dt>Actividad</dt><dd>{activityLabel}</dd></div>{bio?.hand&&<div><dt>Mano</dt><dd>{handLabel(bio.hand)}</dd></div>}<div data-status={status==='En activo'?'active':'retired'}><dt>Estado</dt><dd>{status}</dd></div></dl>
          </div>
        </div>
      </header>
      <section className={styles.careerBoard} aria-label="Resumen de carrera">{coreMetrics.map(metric=><article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.context}</small></article>)}</section>
    </div>

    <PlayerProfileNav hasRivals={rivals.length>=2} hasTournaments={tournaments.length>0} hasSeasons={showSeasonAnalysis}/>

    <main className="pp-content">
      <section className={`pp-section pp-performance ${styles.careerSummary}`} id="rendimiento" aria-labelledby="pp-performance-title">
        <div className="pp-section-heading"><div><h2 id="pp-performance-title">Resumen de carrera</h2></div></div>
        <div className={styles.summaryGrid}>
          <div className={styles.balanceBlock} aria-label={`${number(player.won)} victorias y ${number(player.played-player.won)} derrotas`}>
            <div className={styles.balanceHeading}><span>Carrera</span><strong>{number(winRate,1)} %</strong></div>
            <dl className={styles.balanceTotals}><div><dt>Victorias</dt><dd>{number(player.won)}</dd></div><div><dt>Derrotas</dt><dd>{number(player.played-player.won)}</dd></div><div><dt>Partidos</dt><dd>{number(player.played)}</dd></div></dl>
          </div>
          {displayedSurfaceRows.length?<div className="pp-surface-list">{displayedSurfaceRows.map(surface=><article key={surface.key} data-event-surface={surface.key} data-best={surface.key===bestSurface?.key||undefined}><div><span>{surface.label}</span><strong>{number(surface.rate,1)} %</strong></div><dl><div><dt>Victorias</dt><dd>{number(surface.wins)}</dd></div><div><dt>Derrotas</dt><dd>{number(surface.losses)}</dd></div><div><dt>Partidos</dt><dd>{number(surface.played)}</dd></div></dl></article>)}</div>:null}
        </div>
        {insights.length?<dl className={styles.archiveNotes}>{insights.map(insight=><div key={insight.label} data-kind={insight.kind} data-has-photo={Boolean(insight.photo)||undefined}>{insight.photo&&<><Image src={insight.photo.src} alt="" fill sizes="(max-width: 759px) 78vw, 240px" style={{objectPosition:insight.photo.objectPosition}}/><span aria-hidden="true"/></>}<dt>{insight.label}</dt><dd>{insight.value}</dd><small>{insight.detail}</small></div>)}</dl>:null}
      </section>

      {showSeasonAnalysis?<div className={styles.analysisGrid} id="temporadas">
        {showCareerEvolution?<section className="pp-section pp-seasons" aria-labelledby="pp-seasons-title"><PlayerCareerTimeline seasons={careerSeasons}/></section>:null}
        {rankingPoints.length?<PlayerRankingSlider points={rankingPoints}/>:null}
      </div>:null}

      {galleryPhotos.length?<section className={`pp-section ${styles.mediaSection}`} aria-labelledby="pp-media-title"><div className="pp-section-heading"><div><h2 id="pp-media-title">Momentos del archivo</h2></div></div><div className={styles.mediaGallery}>{galleryPhotos.map((photo,index)=><figure key={photo.src} data-featured={index===0||undefined}><Image src={photo.src} alt={photo.alt} fill sizes={index===0?'(max-width: 759px) 100vw, 620px':'(max-width: 759px) 100vw, 310px'} style={{objectPosition:photo.objectPosition}}/><figcaption><span>{photo.alt}</span></figcaption></figure>)}</div></section>:null}

      {tournaments.length?<section className="pp-section pp-tournaments" id="torneos" aria-labelledby="pp-tournaments-title"><PlayerTournamentArchive tournaments={tournaments.slice(0,18).map(tournament=>{
        const branding=tournamentBrandingFor(tournament.rawName);
        const target=directory.get(tournament.rawName);
        return {slug:tournament.slug,name:tournament.name,surfaceKey:tournament.surfaceKey,category:tournament.category,titles:tournament.titles,titleYears:tournament.titleYears,brandingSrc:branding?.src,trophySrc:branding?.trophySrc,href:target?.slug?`/${target.slug}`:undefined};
      })}/></section>:null}

      {rivals.length>=2?<section className="pp-section pp-rivals" id="enfrentamientos" aria-labelledby="pp-rivals-title"><PlayerRivals rivals={rivals} player={{name:player.name,country:bio?.country}} compareHref={`/comparar?a=${encodeURIComponent(player.name)}`}/></section>:null}

      <section className="pp-section pp-matches" id="partidos" aria-labelledby="pp-matches-title"><PlayerRecentMatches matches={recent} allHref={`/buscar?player=${encodeURIComponent(player.name)}&scope=matches`}/></section>
    </main>
  </div>;
}
