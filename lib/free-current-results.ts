import {finalsIdentity} from './finals-identity';
import {hasClosedModernResult} from './modern-result';
import type {Season} from './result-refresh';

type Tour='atp'|'wta';
type Row={id:unknown;tour?:unknown;tier?:unknown;draw?:unknown;is_doubles?:unknown;is_qualifying?:unknown;scheduled_time?:unknown;event_date?:unknown;status?:unknown;outcome?:unknown;winner?:unknown;tournament?:unknown;[key:string]:unknown};
type Page={data?:Row[];meta?:{has_more?:boolean;limit?:number}};
type Fixture={match_id?:unknown;status?:unknown;tournament?:unknown;event_date?:unknown;start_time?:unknown};
type FixturePage={data?:Fixture[]};
export type FreeCurrentQueue={ids:string[];at:string};
const tiers:Record<Tour,Set<string>>={
 atp:new Set(['grand_slam','atp_1000','atp_500','atp_finals']),
 wta:new Set(['grand_slam','wta_1000','wta_500','wta_finals']),
};
function wanted(row:Row,tour:Tour){
 return (row.tour===undefined||row.tour===tour)&&row.draw==='singles'&&row.is_qualifying===false
  &&(typeof row.tier==='string'&&tiers[tour].has(row.tier)||finalsIdentity({...row,tour})!==null);
}
/** FREE match detail can settle an ID discovered while it was upcoming. */
export async function collectFreeCurrentResults(tour:Tour,previous:Season,saved:FreeCurrentQueue|undefined,request:(path:string)=>Promise<Page|Row|FixturePage>,maxCalls:number,now=new Date()){
 const known=new Map<string,Row>((previous?.data||[]).map(row=>[String(row.id),row as Row]));
 const queue=new Set(Array.isArray(saved?.ids)?saved.ids.filter(id=>/^[1-9]\d*$/.test(id)):[]);
 let calls=0,complete=true;
 const fresh:Row[]=[];
 const otherYears=new Map<number,Row[]>();
 // The FREE fixture feed can still expose a finished Finals match by ID after
 // it has disappeared from the FREE upcoming list. Bootstrap only this reviewed
 // 2026 gap, once, when no queue exists yet.
 if(!saved&&now.getTime()>=Date.parse('2026-11-16T00:00:00Z')&&now.getTime()<Date.parse('2026-12-01T00:00:00Z')&&maxCalls>3){
  const fixtures=await request(`/fixtures?tour=${tour}&draw=singles&limit=200&offset=0`) as FixturePage;
  calls++;
  if(!Array.isArray(fixtures.data))throw new Error('Incomplete FREE fixture page');
  const finalsName=tour==='atp'?'finals - turin':'finals - riyadh';
  for(const fixture of fixtures.data)if(fixture.status==='finished'
   &&String(fixture.tournament||'').trim().toLowerCase()===finalsName
   &&String(fixture.start_time||fixture.event_date||'').startsWith('2026-11-')
   &&Number.isSafeInteger(fixture.match_id)&&Number(fixture.match_id)>0
   &&!known.has(String(fixture.match_id)))queue.add(String(fixture.match_id));
 }
 for(const id of [...queue]){
  if(calls>=maxCalls-1){complete=false;break}
  let row:Row;
  try{row=await request(`/matches/${id}`) as Row}
  catch(error){if([404,410].includes(Number((error as {status?:unknown})?.status))){queue.delete(id);calls++;continue}throw error}
  calls++;
  if(String(row.id)!==id||row.tour!==tour)throw new Error('FREE match identity mismatch');
  if(row.outcome==='completed'&&wanted(row,tour)&&hasClosedModernResult(row)){
   const playedYear=Number(String(row.scheduled_time||row.event_date||'').slice(0,4));
   if(Number.isSafeInteger(playedYear)&&playedYear>=2023&&playedYear!==now.getUTCFullYear()){
    otherYears.set(playedYear,[...(otherYears.get(playedYear)||[]),row]);
   }else known.set(id,row);
   fresh.push(row);queue.delete(id);
  }else if(['walkover','default','abandoned','cancelled'].includes(String(row.outcome))
   ||row.status==='cancelled'){queue.delete(id)}
  // An unfinished or incomplete result remains queued for the next run.
 }
 const from=new Date(now.getTime()-86_400_000).toISOString().slice(0,10);
 const to=new Date(now.getTime()+86_400_000).toISOString().slice(0,10);
 for(const status of ['upcoming','live'] as const){
  let offset=0;
  do{
   if(calls>=maxCalls){complete=false;break}
   const page=await request(`/matches?status=${status}&tour=${tour}&draw=singles&from=${from}&to=${to}&limit=200&offset=${offset}`) as Page;
   calls++;
   if(!Array.isArray(page.data)||typeof page.meta?.has_more!=='boolean')throw new Error(`Incomplete FREE ${status} page`);
   for(const row of page.data)if(wanted(row,tour)&&Number.isSafeInteger(row.id)&&Number(row.id)>0
    &&(status==='live'||typeof row.scheduled_time==='string'&&Date.parse(row.scheduled_time)<=now.getTime()+86_400_000)
    &&!known.has(String(row.id)))queue.add(String(row.id));
   if(!page.meta.has_more)break;
   if(!Number.isSafeInteger(page.meta.limit)||Number(page.meta.limit)<=0)throw new Error('Invalid FREE pagination');
   offset+=page.meta.limit!;
  }while(true);
 }
 return {data:[...known.values()],fresh,otherYears,queue:{ids:[...queue],at:now.toISOString()},calls,complete,scope:`${tour}-main-v2` as const,at:now.toISOString()};
}
