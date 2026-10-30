import type { Match } from './types';
import { eligibleMatch } from './quality';
import { chronological, roundPosition } from './editorial';
/** Exact match dates only: a tournament's start is never an anniversary. */
export function homeSelection(matches:Match[],today=new Date()) {
  const stamp=today.toISOString().slice(0,10),year=today.getUTCFullYear();
  const sorted=matches.filter(m=>m.data_source!=='mock'&&eligibleMatch(m)).sort((a,b)=>chronological(b,a));
  const sameDay=sorted.filter(m=>m.year<year&&m.context?.dateLabel==='Fecha del partido'&&m.context.date?.slice(5,10)===stamp.slice(5));
  const anniversaryByDecade=new Map<number,Match>();
  for(const match of [...sameDay].sort((a,b)=>roundPosition(b.round)-roundPosition(a.round)||chronological(b,a))){
    const decade=Math.floor(match.year/10)*10;
    if(!anniversaryByDecade.has(decade)) anniversaryByDecade.set(decade,match);
  }
  const anniversaries=[...anniversaryByDecade.values()].sort((a,b)=>chronological(b,a)).slice(0,8);
  const anniversary=anniversaries[0] || sameDay[0];
  const featured=sorted.find(m=>roundPosition(m.round)===7&&['Grand Slam','Masters 1000'].includes(m.category)&&m.match_id!==anniversary?.match_id)||sorted.find(m=>m.match_id!==anniversary?.match_id);
  return {anniversary,anniversaries,featured,latest:sorted.filter(m=>m.match_id!==featured?.match_id&&m.match_id!==anniversary?.match_id&&!anniversaries.some(item=>item.match_id===m.match_id)).slice(0,3)};
}

export type PreparedHomeIndex = { byDay: Record<string, Match[]>; latestPool: Match[] };

/** Compact daily home material avoids decoding the full match archive on navigation. */
export function prepareHomeIndex(matches: Match[]): PreparedHomeIndex {
  const sorted=matches.filter(m=>m.data_source!=='mock'&&eligibleMatch(m)).sort((a,b)=>chronological(b,a));
  const compact=(match:Match):Match=>({...match,point_tape:[],statistics:[],raw_fixture:undefined,raw_point_tape:undefined});
  const groups=new Map<string, Map<number, Match[]>>();
  for(const match of sorted){
    if(match.context?.dateLabel!=='Fecha del partido'||!match.context.date)continue;
    const day=match.context.date.slice(5,10),decade=Math.floor(match.year/10)*10;
    const perDecade=groups.get(day)||new Map<number,Match[]>();
    const candidates=perDecade.get(decade)||[];
    candidates.push(match);
    perDecade.set(decade,candidates);
    groups.set(day,perDecade);
  }
  const byDay:Record<string,Match[]>={};
  for(const [day,decades] of groups){
    byDay[day]=[...decades.values()].flatMap(rows=>rows.sort((a,b)=>roundPosition(b.round)-roundPosition(a.round)||chronological(b,a)).slice(0,4).map(compact));
  }
  return {byDay,latestPool:sorted.slice(0,24).map(compact)};
}

export function homeSelectionFromIndex(index:PreparedHomeIndex,today=new Date()){
  const year=today.getUTCFullYear(),day=today.toISOString().slice(5,10);
  const perDecade=new Map<number,Match>();
  for(const match of index.byDay[day]||[]){
    if(match.year>=year)continue;
    const decade=Math.floor(match.year/10)*10;
    const current=perDecade.get(decade);
    if(!current||roundPosition(match.round)>roundPosition(current.round)||roundPosition(match.round)===roundPosition(current.round)&&chronological(match,current)>0)perDecade.set(decade,match);
  }
  const anniversaries=[...perDecade.values()].sort((a,b)=>chronological(b,a)).slice(0,8);
  const anniversary=anniversaries[0];
  const featured=index.latestPool.find(m=>roundPosition(m.round)===7&&['Grand Slam','Masters 1000','WTA 1000'].includes(m.category)&&m.match_id!==anniversary?.match_id)||index.latestPool.find(m=>m.match_id!==anniversary?.match_id);
  const excluded=new Set([featured?.match_id,anniversary?.match_id,...anniversaries.map(m=>m.match_id)]);
  const latest=index.latestPool.filter(m=>!excluded.has(m.match_id)).slice(0,3);
  return {anniversary,anniversaries,featured,latest};
}
