import 'server-only';
import type {Match} from './types';
import {asyncCache} from './async-cache';
import {comparisonCanonical} from './comparison-canonical';
import {preparedManifest} from './revista/read-records';
import {comparePlayer,comparisonHeadToHead,comparisonLeadTimeline,comparisonPlayerWon,sharedCareerWindow} from './player-comparison';
import {playerBiography} from './player-bio';
import {playerDirectoryPhoto} from './player-imagery';
import {isDeciding,lostOpening} from './archive-insights';
import {toMatchRecord} from '../data/map-match';
function compileComparison(source:Match[],q:Record<string,string|undefined>,tour:'atp'|'wta',names:string[]){
 const years=[...new Set(source.map(m=>m.year))].sort((a,b)=>a-b);
 const from=Number(q.from)||years[0],to=Number(q.to)||years.at(-1);
 let cohort=source.filter(m=>(!from||m.year>=from)&&(!to||m.year<=to));
 if(q.period==='shared'){const window=sharedCareerWindow(cohort,names as string[],tour);cohort=window?cohort.filter(m=>m.year>=window.first&&m.year<=window.last):[];}
 const models=names.map(name=>comparePlayer(cohort,name!,{tour,surface:q.surface||'all',competition:q.competition||'all',age:q.age,minimum:q.minimum},tour));
 const direct=comparisonHeadToHead(cohort,names as string[],models.map(m=>m.matches),tour);
 const players=models.map(model=>({name:model.name,country:playerBiography(model.name,tour)?.country,photo:playerDirectoryPhoto(model.name,tour),played:model.played,wins:model.won,losses:model.lost,titles:model.titles,finals:model.finals,rate:model.rate,top10:model.top10Won,surfaces:model.surfaces,straight:model.matches.filter(m=>comparisonPlayerWon(m,model.name,tour)&&m.score_summary.games.length>0&&m.score_summary.games.every(set=>set[m.winner!-1]>set[2-m.winner!])).length,comebacks:model.matches.filter(m=>comparisonPlayerWon(m,model.name,tour)&&lostOpening(m)).length,deciding:model.matches.filter(m=>comparisonPlayerWon(m,model.name,tour)&&isDeciding(m)).length,
 years:[...new Set(model.matches.map(m=>m.year))].sort((a,b)=>a-b).map(year=>{const ms=model.matches.filter(m=>m.year===year);const wins=ms.filter(m=>comparisonPlayerWon(m,model.name,tour)).length;return{year,played:ms.length,wins,rate:ms.length?wins/ms.length*100:null}})}));
 return {players,meetings:direct.map(toMatchRecord),wins:names.map(name=>direct.filter(match=>comparisonPlayerWon(match,name,tour)).length),timeline:comparisonLeadTimeline(direct,names,tour).map(point=>({match:toMatchRecord(point.match),wins:point.wins}))};
}
const comparisons=asyncCache<ReturnType<typeof compileComparison>>(86_400_000,16,undefined,{maxWeight:16*1024*1024,weight:value=>JSON.stringify(value).length*2});
export async function preparedComparison(q:Record<string,string|undefined>,tour:'atp'|'wta',requested:string[],load:()=>Promise<Match[]>){
 const names=[...requested].sort((a,b)=>a.localeCompare(b,'es'));
 const manifest=await preparedManifest();
 const key=manifest.version+':'+comparisonCanonical({...q,tour,a:names[0],b:names[1]});
 const value=await comparisons(key,async()=>compileComparison(await load(),q,tour,names));
 if(requested[0]===names[0])return value;
 return {...value,players:[...value.players].reverse(),wins:[...value.wins].reverse(),timeline:value.timeline.map(point=>({...point,wins:[point.wins[1],point.wins[0]] as [number,number]}))};
}
