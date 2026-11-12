import {eligibleMatch} from '../quality';
import {hasExactDate,personKey} from './contracts';
import type {Match} from '../types';
export const DATED_ELO_VERSION='deuce-research-daily-exact-v1';
type State={rating:number;played:number};
/** Research-only model. Unknown dates never enter; an entire day uses pre-day ratings.
 * This avoids imposing a fabricated within-day order on historical matches. */
export function datedEloEvidence(matches:readonly Match[]){
 const states=new Map<string,State>(),elo=new Map<string,number>(),days=new Map<string,Match[]>();
 for(const m of matches){if(!eligibleMatch(m)||!hasExactDate(m))continue;const date=m.context!.date!.slice(0,10);const batch=days.get(date)||[];batch.push(m);days.set(date,batch)}
 const calibration={atp:{matches:0,brier:0,logLoss:0},wta:{matches:0,brier:0,logLoss:0}};
 for(const [,batch] of [...days].sort(([a],[b])=>a.localeCompare(b))){
  const updates=new Map<string,{delta:number;played:number}>();
  for(const m of batch.sort((a,b)=>a.match_id.localeCompare(b.match_id))){
   const tour=m.tour||'atp',ka=personKey(tour,m.player1.name),kb=personKey(tour,m.player2.name);
   const a=states.get(ka)||{rating:1500,played:0},b=states.get(kb)||{rating:1500,played:0};
   elo.set(m.match_id+'|'+m.player1.name,a.rating);elo.set(m.match_id+'|'+m.player2.name,b.rating);
   const expected=1/(1+10**((b.rating-a.rating)/400)),outcome=m.winner===1?1:0;
   const importance=m.category==='Grand Slam'?1.2:/1000/.test(m.category)?1.1:1;
   const k=Math.max(16,32-Math.floor(Math.min(a.played,b.played)/40))*importance,delta=k*(outcome-expected);
   for(const [key,change] of [[ka,delta],[kb,-delta]] as const){const u=updates.get(key)||{delta:0,played:0};u.delta+=change;u.played++;updates.set(key,u)}
   if(a.played>=10&&b.played>=10){const c=calibration[tour],p=Math.max(1e-6,Math.min(1-1e-6,expected));c.matches++;c.brier+=(p-outcome)**2;c.logLoss-=outcome*Math.log(p)+(1-outcome)*Math.log(1-p)}
  }
  for(const [key,u] of updates){const before=states.get(key)||{rating:1500,played:0};states.set(key,{rating:before.rating+u.delta,played:before.played+u.played})}
 }
 return {elo,eloVersion:DATED_ELO_VERSION,method:'Base 1500; escala 400; K 16–32 ponderado por categoría; solo fechas exactas; actualización por día; ATP y WTA aislados. No es un ranking oficial. Calibración posterior a 10 partidos previos por participante.',calibration:Object.fromEntries(Object.entries(calibration).map(([tour,c])=>[tour,{matches:c.matches,brier:c.matches?c.brier/c.matches:null,logLoss:c.matches?c.logLoss/c.matches:null}]))};
}
