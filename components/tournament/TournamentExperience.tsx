import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { HomeMotion } from '@/components/deuce/HomeMotion';
import { ArchiveMatchRow } from '@/components/deuce/MatchArchivePage';
import TournamentBracket from '@/components/TournamentBracket';
import { toMatchRecord } from '@/data/map-match';
import type { Match } from '@/lib/types';
import type { Photo } from '@/lib/imagery';
import { homePhoto, homePlayerPhoto, type HomeMediaKey } from '@/lib/home-media';
import { playerPhoto } from '@/lib/player-imagery';
import { editionHeroPhotoForTournament, championPhotoForEdition, reviewedPhotoForEdition, playerPhotoAtTournament, mediaForEdition, latestMediaForTournament } from '@/lib/tournament-media';
import { tournamentMarkFor } from '@/lib/tournament-branding';
import { tournamentEditionStory } from '@/lib/tournament-story';
import { TournamentDataAtlas } from './TournamentDataAtlas';
import { TournamentRoundLens } from './TournamentRoundLens';
import { TournamentFilm } from './TournamentFilm';
import { number } from '@/lib/cuaderno/model';
import { categoryLabel, tournamentRows } from '@/lib/tournament-directory';
import { chronological, durationLabel, roundPosition, scoreFor, winnerName } from '@/lib/editorial';
import { playerSlug } from '@/lib/explore';
import { browserRound } from '@/lib/match-browser';
import { gamesInMatch, isDeciding, lostOpening, tiebreakCount } from '@/lib/archive-insights';
import { eligibleMatch } from '@/lib/quality';
import { publishedMatchMinutes } from '@/lib/duration';
import { tournamentBracketRounds } from '@/lib/tournament-bracket';
import { imageFocus } from '@/lib/image-focus';
import { tournamentArchiveOptions } from '@/lib/tournament-navigation';
import { editionTacticalProfile, type EditionProduct } from '@/lib/archive-products';
import { TournamentNavigator, TournamentStoryRail, EditionYearRail, PalmaresRail } from './TournamentControls';
import styles from './tournament-experience.module.css';

type BaseProps={slug:string;name:string;rawName:string;category:string;tour:'atp'|'wta';matches:Match[];allMatches:Match[];photo:Photo|null};
const venueKeys:Record<string,HomeMediaKey>={'australian-open':'australian-open','roland-garros':'roland-garros',wimbledon:'wimbledon','us-open':'us-open','indian-wells':'indian-wells',miami:'miami','monte-carlo':'monte-carlo',madrid:'madrid',rome:'rome',canada:'canada',cincinnati:'cincinnati',shanghai:'shanghai',paris:'paris'};

function theme(slug:string,category:string){
  const majors:Record<string,[string,string,string]>={'australian-open':['#092a3a','#8fdded','#123e4d'],'roland-garros':['#293328','#ffc29b','#694332'],wimbledon:['#19372d','#e2cefa','#3b3451'],'us-open':['#09213d','#edda87','#153553']};
  const scoreBackground:Record<string,string>={'australian-open':'#dbe9ec','roland-garros':'#e9dfd3',wimbledon:'#e4e0eb','us-open':'#dde5ef'};
  const [deep,accent,panel]=category==='Grand Slam'&&majors[slug]?majors[slug]:['var(--brand-deep,#0a281d)','var(--brand-accent,#d0e699)','var(--brand-panel,#163b2b)'];
  const style={'--t-deep':`var(--brand-deep,${deep})`,'--t-accent':`var(--brand-accent,${accent})`,'--t-panel':`var(--brand-panel,${panel})`,'--score-bg':scoreBackground[slug]||'#dfe8e1','--score-ink':'var(--brand-ink,#18392d)','--score-muted':'var(--brand-ink,#51665a)','--score-winner':'var(--brand-action,#176747)','--score-hover':scoreBackground[slug]||'#e5ece6'} as CSSProperties;
  return {style,palette:{surface:`var(--brand-deep,${deep})`,panel:`var(--brand-panel,${panel})`,accent:`var(--brand-accent,${accent})`}};
}
function playerImage(name:string,tour:'atp'|'wta',tournament:string,year?:number){
  return (year?reviewedPhotoForEdition(tournament,year,name,tour):null)||(tour==='atp'&&year?championPhotoForEdition(tournament,year):null)||homePlayerPhoto(name)||(tour==='atp'?playerPhotoAtTournament(name,tournament,year?[year]:undefined):null)||playerPhoto(name,tour);
}
function Scene({photo,sizes='(max-width:600px) 100vw, 600px'}:{photo:Photo;sizes?:string}){
  return <Image src={photo.src} alt={photo.alt} fill quality={88} sizes={sizes} style={imageFocus(photo.objectPosition||'center',photo.mobileObjectPosition||photo.objectPosition||'center')}/>;
}
function World({children,props,year}:{children:ReactNode;props:BaseProps;year?:number}){
  const photo=(year?editionHeroPhotoForTournament(props.rawName,year,props.tour,props.category):null)||(venueKeys[props.slug]?homePhoto(venueKeys[props.slug]):props.photo);
  const brand=tournamentMarkFor(props.rawName,props.tour);
  const {style,palette}=theme(props.slug,props.category);
  return <HomeMotion className={styles.motion}><div className={styles.world} style={style} data-tournament-experience="" data-circuit={props.tour}>
    <header className={styles.hero} data-edition={year||undefined} data-home-depth="55"><div className={styles.heroMedia}>{photo&&<Image src={photo.src} alt={photo.alt} fill priority quality={88} sizes="100vw" style={imageFocus(photo.objectPosition||'center',photo.mobileObjectPosition||photo.objectPosition||'center')}/>}<span className={styles.heroShade} aria-hidden="true"/></div><div className={styles.heroCopy}><div className={styles.heroIdentity}>{brand&&<span className={styles.tournamentLogo} data-monochrome={brand.monochrome||undefined} data-circuit-logo={brand.circuitFallback||undefined}><Image src={brand.src} alt={brand.circuitFallback?`Logo oficial ${props.tour.toUpperCase()}`:`Logo de ${props.name}`} width={128} height={128} unoptimized/></span>}<div className={styles.heroText}><h1 data-hero-tournament-name="">{props.name}{year&&<strong className={styles.inlineYear}> {year}</strong>}</h1><p className={styles.heroCategory}>{brand.circuitFallback?`${props.tour.toUpperCase()} ${props.category.match(/1000|500|250|125/)?.[0]||categoryLabel(props.category).replace(/^ATP |^WTA /,'')}`:categoryLabel(props.category)}</p></div></div><div className={styles.dock}><TournamentNavigator key={`${props.slug}-${props.tour}-${year||'summary'}`} options={tournamentArchiveOptions(props.slug,props.allMatches,props.category,props.tour)} tour={props.tour} year={year} palette={palette}/></div></div></header>
    <div className={styles.content}>{children}</div>
  </div></HomeMotion>;
}
function MatchFeature({match,title,detail}:{match:Match;title:string;detail?:string}){
  return <article className={styles.spotlight}><div><h3>{title}</h3>{detail&&<p>{detail}</p>}</div><ArchiveMatchRow match={toMatchRecord(match)}/></article>;
}
function pressureData(matches:Match[]){
  return [['Al set decisivo',matches.filter(isDeciding).length],['Con tie-break',matches.filter(match=>tiebreakCount(match)>0).length],['Remontadas del primer set',matches.filter(match=>lostOpening(match)).length]].map(([label,count])=>({label:String(label),count:Number(count),rate:matches.length?Number(count)/matches.length*100:0}));
}

export function TournamentOverviewExperience(props:BaseProps){
  const {matches,tour,rawName,slug}=props;
  const completed=matches.filter(eligibleMatch),pieces=tournamentRows(completed);
  const finals=completed.filter(match=>roundPosition(match.round)===7&&winnerName(match)).sort((a,b)=>chronological(b,a));
  const years=[...new Set(matches.map(match=>match.year))].sort((a,b)=>b-a);
  const options=tournamentArchiveOptions(slug,props.allMatches,props.category,tour).find(option=>option.tour===tour);
  const editionHref=(year:number)=>options?.editions.find(edition=>edition.year===year)?.href||`/torneos/${slug}/${year}?cuadro=${tour}`;
  const totalGames=completed.reduce((sum,match)=>sum+gamesInMatch(match),0),totalSets=completed.reduce((sum,match)=>sum+match.score_summary.games.length,0);
  const leader=pieces.titles[0],leaderPhoto=leader?playerImage(leader.name,tour,rawName):null;
  const counts=new Map<number,number>();for(const match of completed){const decade=Math.floor(match.year/10)*10;counts.set(decade,(counts.get(decade)||0)+1);}
  const decades=[...counts].sort(([a],[b])=>a-b);
  const marathon=[...completed].sort((a,b)=>gamesInMatch(b)-gamesInMatch(a))[0];
  const rateLeader=pieces.rate[0],film=tour==='atp'?latestMediaForTournament(rawName,years):null;
  return <World props={props}>
    {finals.length>0&&<TournamentStoryRail title={tour==='wta'?'Las campeonas. Sus ediciones.':'Los campeones. Sus ediciones.'}>{finals.slice(0,10).map(final=>{
      const champion=winnerName(final)!,opponent=final.player1.name===champion?final.player2.name:final.player1.name,photo=playerImage(champion,tour,rawName,final.year);
      return <li className={styles.championSlide} key={final.match_id}><Link href={editionHref(final.year)} aria-label={`Edición ${final.year}. ${champion}`}>
        {photo&&<Scene photo={photo} sizes="280px"/>}<span className={styles.photoShade} aria-hidden="true"/><span className={styles.championYear}>{final.year}</span><span className={styles.championCopy}><strong>{champion}</strong><span>Final ante {opponent}</span><small>{scoreFor(final,champion)}</small></span>
      </Link></li>;
    })}</TournamentStoryRail>}
    {leader&&<section className={styles.dominance} id="palmares"><div className={styles.sectionTitle}><h2>El palmarés.</h2><p>Títulos en las finales del archivo</p></div><div className={styles.dominanceGrid}>
      <Link href={`${leader.href}${tour==='wta'?'?tour=wta':''}`} className={styles.leaderPhoto} data-home-depth="35">{leaderPhoto&&<Scene photo={leaderPhoto}/>}<span className={styles.photoShade} aria-hidden="true"/><div><strong>{number(leader.value)}<span>títulos</span></strong><p>{leader.name}</p></div></Link>
      <PalmaresRail rows={pieces.titles.map(row=>({...row,href:`${row.href}${tour==='wta'?'?tour=wta':''}`}))}/>
    </div></section>}
    <section className={styles.dataJournal} id="datos"><div className={styles.sectionTitle}><h2>El torneo, por dentro.</h2></div><dl className={styles.totals}>{[['Ediciones',years.length],['Partidos',completed.length],['Sets',totalSets],['Juegos',totalGames]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{number(Number(value))}</dd></div>)}</dl>
      <TournamentDataAtlas decades={decades} pressure={pressureData(completed)} rhythm={[{label:'Juegos por partido',value:number(completed.length?totalGames/completed.length:0,1)},{label:'Juegos por set',value:number(totalSets?totalGames/totalSets:0,1)},...(rateLeader?[{label:`Efectividad · ${rateLeader.name}`,value:`${number(rateLeader.value,1)} %`}]:[])]}/>
      {marathon&&<MatchFeature match={marathon} title={`${number(gamesInMatch(marathon))} juegos. Un solo partido.`} detail={`El partido con más juegos del archivo de ${props.name}.`}/>}
    </section>
    {film&&<TournamentFilm video={film.video} photo={film.trophy}/>}
    <section className={styles.archive} id="ediciones"><div className={styles.sectionTitle}><h2>Todas las ediciones.</h2></div><EditionYearRail editions={years.map(year=>{const final=finals.find(match=>match.year===year);return {year,href:editionHref(year),champion:final?winnerName(final)||'Ver cuadro':'Ver cuadro',matches:matches.filter(match=>match.year===year).length};})}/></section>
  </World>;
}

function FinalScene({final,portrait}:{final:Match;portrait:Photo|null;tour:'atp'|'wta';year:number}){
  const record=toMatchRecord(final),minutes=publishedMatchMinutes(final);
  return <section className={styles.finalSection} id="final-edition" aria-labelledby="final-edition-title"><div className={styles.sectionTitle}><h2 id="final-edition-title">La final.</h2></div><div className={styles.finalStage} data-has-photo={Boolean(portrait)}>
    {portrait&&<div className={styles.finalScenePhoto} data-home-depth="30"><Scene photo={portrait} sizes="(max-width:600px) 100vw, 1100px"/><span className={styles.photoShade}/></div>}
    <div className={styles.finalResult}><ArchiveMatchRow match={record}/><div className={styles.finalMeta}><span>{gamesInMatch(final)} juegos{minutes!==null&&` · ${durationLabel(minutes)}`}</span><Link href={record.href} className={styles.eventAction}>Ver la final <ArrowUpRight size={18}/></Link></div></div>
  </div></section>;
}

export function TournamentEditionExperience({year,product,...props}:BaseProps&{year:number;product?:EditionProduct|null}){
  const completed=props.matches.filter(eligibleMatch),final=completed.find(match=>roundPosition(match.round)===7),champion=final?winnerName(final):null;
  const portrait=champion?playerImage(champion,props.tour,props.rawName,year):null;
  const totalGames=product?.games??completed.reduce((sum,match)=>sum+gamesInMatch(match),0),sets=product?.sets??completed.reduce((sum,match)=>sum+match.score_summary.games.length,0);
  const entrants=new Set(props.matches.flatMap(match=>[match.player1.name,match.player2.name])).size;
  const marathon=[...completed].sort((a,b)=>gamesInMatch(b)-gamesInMatch(a))[0];
  const longest=[...completed].filter(match=>publishedMatchMinutes(match)!==null).sort((a,b)=>publishedMatchMinutes(b)!-publishedMatchMinutes(a)!)[0];
  const tactical=product?.tactical||editionTacticalProfile(completed);
  const cleanWins=completed.filter(match=>match.winner&&match.score_summary.games.every(set=>set[match.winner!-1]>set[2-match.winner!])).length;
  const bagels=completed.reduce((count,match)=>count+match.score_summary.games.filter(set=>set.includes(0)&&set.includes(6)).length,0);
  const narrowWins=completed.filter(match=>{const games=match.score_summary.games.reduce((sum,set)=>[sum[0]+set[0],sum[1]+set[1]],[0,0]);return match.winner&&games[match.winner-1]<games[2-match.winner];}).length;
  const extra=[['Sin ceder un set',number(cleanWins)],['Sets 6–0',number(bagels)],['Victorias con menos juegos',number(narrowWins)],...(tactical.acesPerMatch?[['Aces por partido',number(tactical.acesPerMatch.value,1)]]:[]),...(tactical.breakRate?[['Conversión de break',`${number(tactical.breakRate.value,1)} %`]]:[]),...(longest?[['Mayor duración',durationLabel(publishedMatchMinutes(longest)!)]]:[])];
  const story=tournamentEditionStory(props.matches,{tournament:props.rawName,year,category:props.category,tour:props.tour});
  const film=props.tour==='atp'?mediaForEdition(props.rawName,year):null;
  return <World props={props} year={year}>
    {final&&<FinalScene final={final} portrait={portrait} tour={props.tour} year={year}/>}
    <section className={styles.editionReadings} id="lecturas"><div className={styles.sectionTitle}><div><h2>La dimensión de esta edición.</h2><p>Participantes y juego registrado en el cuadro {props.tour==='wta'?'femenino':'masculino'}.</p></div></div><dl className={styles.totals}>{[['Participantes',entrants],['Partidos',completed.length],['Sets',sets],['Juegos',totalGames]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{number(Number(value))}</dd></div>)}</dl></section>
    {story.path.length>1&&<TournamentStoryRail title="El camino al título." id="camino">{story.path.filter(match=>roundPosition(match.round)!==7).map(match=><li className={styles.pathSlide} key={match.match_id}><p>{browserRound(match)}</p><ArchiveMatchRow match={toMatchRecord(match)}/></li>)}</TournamentStoryRail>}
    <TournamentRoundLens rounds={story.rounds}/>
    {story.leaders.length>0&&<section className={styles.editionNames} aria-labelledby="edition-names-title"><div className={styles.sectionTitle}><div><h2 id="edition-names-title">Los nombres de la edición.</h2><p>Victorias en este cuadro. El balance cuenta los juegos ganados menos los perdidos.</p></div></div><div className={styles.namesGrid}>{story.leaders.slice(0,6).map((row,index)=>{const image=playerImage(row.name,props.tour,props.rawName);return <Link href={`/jugadores/${playerSlug(row.name)}${props.tour==='wta'?'?tour=wta':''}`} key={row.name}><span className={styles.namePortrait}>{image&&<Scene photo={image} sizes="130px"/>}</span><div><strong>{row.name}</strong><span>{row.wins} {row.wins===1?'victoria':'victorias'} · {row.lostSets} sets cedidos</span><small>Balance de juegos <b>{row.balance>0?'+':''}{row.balance}</b></small></div><span className={styles.namePosition}>{index+1}</span></Link>;})}</div></section>}
    {film&&<TournamentFilm video={film.video} photo={film.trophy}/>}
    <div className={styles.bracketWorld}><TournamentBracket key={`${props.slug}-${props.tour}-${year}`} rounds={tournamentBracketRounds(props.matches)} heading={`El cuadro ${props.tour==='wta'?'femenino':'masculino'}.`}/></div>
    <section className={styles.editionReadings}><div className={styles.sectionTitle}><div><h2>Lo que dejó el juego.</h2><p>Remontadas, desempates y los partidos que más exigieron.</p></div></div>
      <TournamentDataAtlas pressure={pressureData(completed)} rhythm={[{label:'Juegos por partido',value:number(completed.length?totalGames/completed.length:0,1)},{label:'Juegos por set',value:number(sets?totalGames/sets:0,1)},{label:'Tie-breaks disputados',value:number(product?.tiebreaks??completed.reduce((sum,match)=>sum+tiebreakCount(match),0))},...extra.map(([label,value])=>({label,value}))]}/>
      {marathon&&<MatchFeature match={marathon} title={`${number(gamesInMatch(marathon))} juegos en un partido.`} detail="El mayor recorrido de esta edición."/>}
      {longest&&longest.match_id!==marathon?.match_id&&<MatchFeature match={longest} title={durationLabel(publishedMatchMinutes(longest)!)} detail="El partido de mayor duración publicada."/>}
    </section>
    <p className={styles.closing}><Link href={tournamentArchiveOptions(props.slug,props.allMatches,props.category,props.tour).find(option=>option.tour===props.tour)?.summaryHref||`/torneos/${props.slug}`}>Volver al resumen del torneo</Link></p>
  </World>;
}
