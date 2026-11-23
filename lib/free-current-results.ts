import {finalsIdentity} from './finals-identity';
import {hasSettledModernResult} from './modern-result';
import type {Season} from './result-refresh';

type Tour='atp'|'wta';
type Row={id:unknown;tour?:unknown;tier?:unknown;draw?:unknown;is_doubles?:unknown;is_qualifying?:unknown;scheduled_time?:unknown;event_date?:unknown;status?:unknown;outcome?:unknown;winner?:unknown;tournament?:unknown;[key:string]:unknown};
type Page={data?:Row[];meta?:{has_more?:boolean;limit?:number}};
type Fixture={match_id?:unknown;status?:unknown;tournament?:unknown;event_date?:unknown;start_time?:unknown;is_qualifying?:unknown;tier?:unknown};
type FixturePage={data?:Fixture[];meta?:{has_more?:boolean;limit?:number}};
export type FreeCurrentQueue={ids:string[];at:string;discovered?:number;grandSlamWindowDays?:number};
const tiers:Record<Tour,Set<string>>={
 atp:new Set(['grand_slam','atp_1000','atp_500','atp_250','atp_finals']),
 wta:new Set(['grand_slam','wta_1000','wta_500','wta_250','wta_finals']),
};
function wanted(row:Row,tour:Tour){
 const finals=finalsIdentity({...row,tour})!==null;
 return (row.tour===undefined||row.tour===tour)&&row.draw==='singles'
  &&(row.is_qualifying===false&&typeof row.tier==='string'&&tiers[tour].has(row.tier)
   ||row.is_qualifying!==true&&finals);
}
/** Discover finished fixtures once daily, then settle their stable IDs. No live polling. */
export async function collectFreeCurrentResults(tour:Tour,previous:Season,saved:FreeCurrentQueue|undefined,request:(path:string)=>Promise<Page|Row|FixturePage>,maxCalls:number,now=new Date()){
 const known=new Map<string,Row>((previous?.data||[]).map(row=>[String(row.id),row as Row]));
 const queue=new Set(Array.isArray(saved?.ids)?saved.ids.filter(id=>/^[1-9]\d*$/.test(id)):[]);
 let calls=0,complete=true;
 const fresh:Row[]=[];
 const otherYears=new Map<number,Row[]>();
 const regularFrom=new Date(now.getTime()-7*86_400_000).toISOString().slice(0,10);
 // A major lasts a fortnight and its first rounds may already be older than the
 // former seven-day window when the final is published. Keep one full draw in
 // scope without spending calls on historical seasons.
 const grandSlamFrom=new Date(now.getTime()-21*86_400_000).toISOString().slice(0,10);
 const to=new Date(now.getTime()-86_400_000).toISOString().slice(0,10);
 let offset=0;
 do{
  if(calls>=maxCalls){complete=false;break}
  // /fixtures supports tour/draw/pagination, but not date or tier filters.
  // Fetch the bounded tour slate and filter the correction window locally.
  const fixtures=await request(`/fixtures?tour=${tour}&draw=singles&limit=200&offset=${offset}`) as FixturePage;
  calls++;
  if(!Array.isArray(fixtures.data))throw new Error('Incomplete FREE fixture page');
  for(const fixture of fixtures.data){
   const played=String(fixture.start_time||fixture.event_date||'').slice(0,10);
   const from=fixture.tier==='grand_slam'?grandSlamFrom:regularFrom;
   if(fixture.status==='finished'&&played>=from&&played<=to
    &&fixture.is_qualifying!==true
    &&(fixture.tier===undefined||fixture.tier===null||tiers[tour].has(String(fixture.tier))||finalsIdentity({...fixture,tour})!==null)
    &&Number.isSafeInteger(fixture.match_id)&&Number(fixture.match_id)>0
    &&!known.has(String(fixture.match_id)))queue.add(String(fixture.match_id));
  }
  if(fixtures.meta?.has_more!==true)break;
  if(!Number.isSafeInteger(fixtures.meta.limit)||Number(fixtures.meta.limit)<=0)throw new Error('Invalid FREE fixture pagination');
  offset+=Number(fixtures.meta.limit);
 }while(true);
 for(const id of [...queue]){
  if(calls>=maxCalls)break
  let row:Row;
  try{row=await request(`/matches/${id}`) as Row}
  catch(error){if([404,410].includes(Number((error as {status?:unknown})?.status))){queue.delete(id);calls++;continue}throw error}
  calls++;
  if(String(row.id)!==id||row.tour!==tour)throw new Error('FREE match identity mismatch');
  if(wanted(row,tour)&&hasSettledModernResult(row)){
   const playedYear=Number(String(row.scheduled_time||row.event_date||'').slice(0,4));
   if(Number.isSafeInteger(playedYear)&&playedYear>=2023&&playedYear!==now.getUTCFullYear()){
    otherYears.set(playedYear,[...(otherYears.get(playedYear)||[]),row]);
   }else known.set(id,row);
   fresh.push(row);queue.delete(id);
  }else if(['walkover','default','abandoned','cancelled'].includes(String(row.outcome))
   ||row.status==='cancelled'){queue.delete(id)}
  // An unfinished or incomplete result remains queued for the next run.
 }
 return {data:[...known.values()],fresh,otherYears,queue:{ids:[...queue],at:now.toISOString(),discovered:fresh.length+queue.size,grandSlamWindowDays:21},calls,complete,scope:`${tour}-main-v3` as const,at:now.toISOString()};
}
