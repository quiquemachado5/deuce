import {createHash} from 'node:crypto';
import type {Match} from './types';
import type {PlayerRecord} from './season-analytics';
import {normalizeText,eligibleMatch} from './quality';
import {createPartition,type MatchBrowserPartition} from './match-browser-snapshot';
import {tournamentRows} from './tournament-directory';
import {chronological,roundPosition,winnerName} from './editorial';
import {gamesInMatch,isDeciding,lostOpening,tiebreakCount} from './archive-insights';

type Tour='atp'|'wta';
export const navigationKey=(tour:Tour,name:string)=>`${tour}:${normalizeText(name)}`;
export type TournamentOverview=ReturnType<typeof buildTournamentOverview>;
export function buildTournamentOverview(matches:Match[]){
 const completed=matches.filter(eligibleMatch),records=tournamentRows(completed);
 // Proof payloads belong to match detail artifacts, never to a summary index.
 const withoutProof=(rows:typeof records.titles)=>rows.map(row=>{const copy={...row};delete copy.proof;return copy;});
 const decades=new Map<number,number>(),editions:Record<number,number>={};
 for(const match of matches)editions[match.year]=(editions[match.year]||0)+1;
 for(const match of completed){const decade=Math.floor(match.year/10)*10;decades.set(decade,(decades.get(decade)||0)+1);}
 const pressure=[['Al set decisivo',completed.filter(isDeciding).length],['Con tie-break',completed.filter(match=>tiebreakCount(match)>0).length],['Remontadas del primer set',completed.filter(lostOpening).length]] as const;
 return {pieces:{titles:withoutProof(records.titles),rate:withoutProof(records.rate)},
  finals:completed.filter(match=>roundPosition(match.round)===7&&winnerName(match)).sort((a,b)=>chronological(b,a)).map(match=>match.match_id),
  years:Object.keys(editions).map(Number).sort((a,b)=>b-a),editions,
  games:completed.reduce((sum,match)=>sum+gamesInMatch(match),0),sets:completed.reduce((sum,match)=>sum+match.score_summary.games.length,0),
  decades:[...decades].sort(([a],[b])=>a-b),marathon:[...completed].sort((a,b)=>gamesInMatch(b)-gamesInMatch(a))[0]?.match_id,
  pressure:pressure.map(([label,count])=>({label,count,rate:completed.length?count/completed.length*100:0}))};
}
export type NavigationEntity={schema:1;partition:MatchBrowserPartition;record?:PlayerRecord;overviews?:Record<string,TournamentOverview>};
export type NavigationIndex={schema:1;count:number;players:Record<string,string>;tournaments:Record<string,string>};
/** Publication-only grouping: bounded entity projections, separated by circuit. */
export function compileNavigationProducts(matches:Match[],records:PlayerRecord[]=[]){
 const recordIndex=new Map(records.map(record=>[navigationKey(record.tour||'atp',record.name),record]));
 const groups=new Map<string,{kind:'players'|'tournaments';tour:Tour;name:string;rows:Match[]}>();
 for(const match of matches){const tour=match.tour||'atp';
  for(const [kind,name] of [['players',match.player1.name],['players',match.player2.name],['tournaments',match.tournament]] as const){
   const key=`${kind}:${navigationKey(tour,name)}`,group=groups.get(key)||{kind,tour,name,rows:[]};
   group.rows.push(match);groups.set(key,group);
  }
 }
 const index:NavigationIndex={schema:1,count:matches.length,players:{},tournaments:{}};
 for(const [key,group] of groups)index[group.kind][navigationKey(group.tour,group.name)]=`navigation-entity-${createHash('sha256').update(key).digest('hex').slice(0,20)}`;
 function* entities():Generator<[string,NavigationEntity]>{
  for(const group of groups.values()){
   const id=index[group.kind][navigationKey(group.tour,group.name)],years=group.rows.map(match=>match.year);
   const partition=createPartition(id,group.tour,Math.min(...years),group.rows);partition.toYear=Math.max(...years);
   const entity:NavigationEntity={schema:1,partition};
   if(group.kind==='players')entity.record=recordIndex.get(navigationKey(group.tour,group.name));
   if(group.kind==='tournaments'){
    entity.overviews={};for(const category of new Set(group.rows.map(match=>match.category)))entity.overviews[category]=buildTournamentOverview(group.rows.filter(match=>match.category===category));
   }
   yield [id,entity];
  }
 }
 return {index,entities};
}
