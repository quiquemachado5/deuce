import type { Match } from './types';
import { eligibleMatch, isRetirement } from './quality';
import { winnerName, chronological } from './editorial';
import { lostOpening } from './archive-insights';

export type SlamSeason = {name:string;year:number;matches:Match[];wins:Match[];finals:Match[];titles:Match[];straight:Match[];comebacks:Match[]};
export type SlamSeasonMetric = 'wins'|'finals'|'titles'|'straight'|'comebacks';
/** One circuit, documented main-draw singles only; a walkover is not a match win. */
export function grandSlamSeasons(input:Match[]):SlamSeason[]{
  if(new Set(input.map(match=>match.tour||'atp')).size>1)throw new Error('Grand Slam seasons require one circuit');
  const groups=new Map<string,SlamSeason>();
  const seen=new Set<string>();
  for(const match of input){
    if(seen.has(match.match_id)||match.category!=='Grand Slam'||match.context?.qualifying||!eligibleMatch(match))continue;
    seen.add(match.match_id);
    for(const name of [match.player1.name,match.player2.name]){
      const key=name+'\0'+match.year;
      const row=groups.get(key)||{name,year:match.year,matches:[],wins:[],finals:[],titles:[],straight:[],comebacks:[]};
      row.matches.push(match);
      const won=winnerName(match)===name,final=match.round.toLowerCase()==='final';
      if(final)row.finals.push(match);
      if(won){row.wins.push(match);if(final)row.titles.push(match);if(!isRetirement(match)&&match.score_summary.sets.some(sets=>sets===0))row.straight.push(match);if(lostOpening(match))row.comebacks.push(match);}
      groups.set(key,row);
    }
  }
  return [...groups.values()];
}
/** Unique players; the latest tied season is selected, never sums of several seasons. */
export function bestGrandSlamSeasons(seasons:SlamSeason[],metric:SlamSeasonMetric){
  const people=new Map<string,SlamSeason>();
  for(const row of seasons){const old=people.get(row.name);if(!old||row[metric].length>old[metric].length||row[metric].length===old[metric].length&&row.year>old.year)people.set(row.name,row);}
  return [...people.values()].filter(row=>row[metric].length>0).map(row=>({...row,evidence:[...row[metric]].sort(chronological)})).sort((a,b)=>b[metric].length-a[metric].length||b.year-a.year||a.name.localeCompare(b.name,'es'));
}
export const grandSlamSeasonRecords:readonly {id:string;title:string;metric:SlamSeasonMetric}[]=[
  {id:'grand-slam-victorias-temporada',title:'Más victorias de Grand Slam en una temporada',metric:'wins'},
  {id:'grand-slam-finales-temporada',title:'Más finales de Grand Slam en una temporada',metric:'finals'},
  {id:'grand-slam-titulos-temporada',title:'Más títulos de Grand Slam en una temporada',metric:'titles'},
  {id:'grand-slam-sin-ceder-set-temporada',title:'Más victorias de Grand Slam sin ceder set en una temporada',metric:'straight'},
  {id:'grand-slam-remontadas-temporada',title:'Más remontadas del primer set en Grand Slam en una temporada',metric:'comebacks'},
];
