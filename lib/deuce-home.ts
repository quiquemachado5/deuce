import type { Match } from './types';
import { eligibleMatch } from './quality';
import { chronological, roundPosition, winnerName } from './editorial';
import { buildSeasonAnalytics } from './season-analytics';

/** Editorial priority within the last 45 days; recency wins inside each tier. */
export function homeRecentResults(matches:Match[],today=new Date()){
  const priority=(category:string)=>category==='Grand Slam'?0:['Masters 1000','WTA 1000'].includes(category)?1:['ATP 500','WTA 500'].includes(category)?2:3;
  const end=today.getTime(),start=end-45*86400000;
  const eligible=matches.filter(match=>match.data_source!=='mock'&&eligibleMatch(match));
  const dated=eligible.filter(match=>{const stamp=Date.parse(match.context?.date||'');return stamp>=start&&stamp<=end;});
  const pool=(dated.length?dated:[...eligible].sort((a,b)=>chronological(b,a)).slice(0,24))
    .sort((a,b)=>priority(a.category)-priority(b.category)||chronological(b,a));
  const chosen=(['atp','wta'] as const).flatMap(tour=>pool.filter(match=>(match.tour||'atp')===tour).slice(0,3));
  const ids=new Set(chosen.map(match=>match.match_id));
  return [...chosen,...pool.filter(match=>!ids.has(match.match_id)).slice(0,Math.max(0,6-chosen.length))]
    .sort((a,b)=>priority(a.category)-priority(b.category)||chronological(b,a));
}

export function prepareCircuitHome(matches: Match[]) {
  const summary = (tour: 'atp'|'wta') => {
    const rows=matches.filter(m=>(m.tour||'atp')===tour&&m.data_source!=='mock'&&eligibleMatch(m));
    const sorted=[...rows].sort((a,b)=>chronological(b,a));
    const compact=(m:Match)=>({...m,point_tape:[],statistics:[],raw_fixture:undefined,raw_point_tape:undefined});
    const leader=buildSeasonAnalytics(rows).players.sort((a,b)=>b.wins-a.wins||a.name.localeCompare(b.name))[0];
    const evidence=leader?sorted.find(m=>winnerName(m)===leader.name):undefined;
    const final=sorted.find(m=>roundPosition(m.round)===7);
    return {count:rows.length,latest:sorted.slice(0,3).map(compact),edition:final?compact(final):undefined,leader:leader&&evidence?{name:leader.name,wins:leader.wins,played:leader.played,evidenceId:evidence.match_id}:undefined};
  };
  return {atp:summary('atp'),wta:summary('wta')};
}

function homeHighlights(sorted: Match[], anniversaries: Match[], anniversary?: Match) {
  const anniversaryIds = new Set([
    anniversary?.match_id,
    ...anniversaries.map(match => match.match_id),
  ].filter((id): id is string => Boolean(id)));
  // "Últimos resultados" is chronological. A separate editorial feature must
  // never remove the newest match from this list when the feature falls back.
  const latest = sorted.filter(match => !anniversaryIds.has(match.match_id)).slice(0, 3);
  const excluded = new Set([...anniversaryIds, ...latest.map(match => match.match_id)]);
  const featured = sorted.find(match =>
    roundPosition(match.round) === 7
    && ['Grand Slam', 'Masters 1000', 'WTA 1000'].includes(match.category)
    && !excluded.has(match.match_id),
  ) || sorted.find(match => !excluded.has(match.match_id));
  return { featured, latest };
}

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
  return {anniversary,anniversaries,...homeHighlights(sorted,anniversaries,anniversary)};
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
  return {anniversary,anniversaries,...homeHighlights(index.latestPool,anniversaries,anniversary)};
}
