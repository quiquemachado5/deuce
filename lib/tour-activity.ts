import type { Match, Tour } from './types';
export type ActivityFixture={id:string;tournament:string;tournamentId:string|null;scheduledAt:string;status:'live'|'upcoming';players:[string,string];surface:string|null;tier:string|null;tour?:Tour};
export type TourActivity={checkedAt:string;fixtures:ActivityFixture[];complete:boolean};
type ProviderFixture={id?:unknown;tournament?:unknown;tournament_id?:unknown;scheduled_time?:unknown;status?:unknown;players?:{p1?:{name?:unknown};p2?:{name?:unknown}};surface?:unknown;tier?:unknown};
export function activityFixtures(rows:ProviderFixture[],status:'live'|'upcoming',tour:Tour='atp'):ActivityFixture[] {
  return rows.flatMap(r=>typeof r.tournament==='string' && typeof r.scheduled_time==='string' && Number.isFinite(Date.parse(r.scheduled_time)) && typeof r.players?.p1?.name==='string' && typeof r.players?.p2?.name==='string'
    ? [{id:String(r.id),tournament:r.tournament,tournamentId:r.tournament_id?String(r.tournament_id):null,scheduledAt:r.scheduled_time,status,players:[r.players.p1.name,r.players.p2.name] as [string,string],surface:typeof r.surface==='string'?r.surface:null,tier:typeof r.tier==='string'?r.tier:null,tour}]:[]);
}
export function tourActivity(activity:TourActivity|null,matches:Match[],now=new Date()) {
  if(!activity || !Array.isArray(activity.fixtures) || !Number.isFinite(Date.parse(activity.checkedAt)) || now.getTime()-Date.parse(activity.checkedAt)>30*3600000 || Date.parse(activity.checkedAt)>now.getTime()+60000)return [];
  const normalize=(name:string)=>name.replace(/^(ATP|WTA)\s+/i,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const grouped=new Map<string,ActivityFixture[]>();
  for(const row of activity.fixtures){
    const at=Date.parse(row.scheduledAt);
    if(!Number.isFinite(at)||typeof row.tournament!=='string'||!Array.isArray(row.players)||at>now.getTime()+7*86400000 || at<now.getTime()-86400000)continue;
    const key=`${row.tour||'atp'}:${row.tournamentId||normalize(row.tournament)}`,list=grouped.get(key)||[];list.push(row);grouped.set(key,list);
  }
  return [...grouped].map(([id,fixtures])=>{
    fixtures.sort((a,b)=>Date.parse(a.scheduledAt)-Date.parse(b.scheduledAt));
    const name=fixtures[0].tournament;
    const recent=matches.filter(m=>(m.tour||'atp')===(fixtures[0].tour||'atp')&&normalize(m.tournament)===normalize(name) && Date.parse(m.context?.date||m.score_summary.timestamp)>=now.getTime()-7*86400000);
    // This is tournament activity, NOT a live score claim. The observation time stays visible.
    const ongoing=fixtures.some(f=>f.status==='live') || (recent.length>0&&!recent.some(m=>m.round.toLowerCase()==='final')&&Date.parse(fixtures[0].scheduledAt)<=now.getTime()+2*86400000);
    return {id,name,fixtures,ongoing,href:`/buscar?tour=${fixtures[0].tour||'atp'}&q=${encodeURIComponent(name.replace(/^(ATP|WTA)\s+/i,''))}`};
  }).sort((a,b)=>Number(b.ongoing)-Number(a.ongoing)).slice(0,4);
}
