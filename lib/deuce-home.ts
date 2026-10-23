import type { Match } from './types';
import { eligibleMatch } from './quality';
import { chronological, roundPosition } from './editorial';
/** Exact match dates only: a tournament's start is never an anniversary. */
export function homeSelection(matches:Match[],today=new Date()) {
  const stamp=today.toISOString().slice(0,10),year=today.getUTCFullYear();
  const sorted=matches.filter(m=>m.data_source!=='mock'&&eligibleMatch(m)).sort((a,b)=>chronological(b,a));
  const anniversary=sorted.find(m=>m.year<year&&m.context?.dateLabel==='Fecha del partido'&&m.context.date?.slice(5,10)===stamp.slice(5));
  const featured=sorted.find(m=>roundPosition(m.round)===7&&['Grand Slam','Masters 1000'].includes(m.category)&&m.match_id!==anniversary?.match_id)||sorted.find(m=>m.match_id!==anniversary?.match_id);
  return {anniversary,featured,latest:sorted.filter(m=>m.match_id!==featured?.match_id&&m.match_id!==anniversary?.match_id).slice(0,3)};
}
