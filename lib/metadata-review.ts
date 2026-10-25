import type { Match } from './types';
import { exactDay } from './archive-freshness';
import { visibleTournamentCategory } from './tournament-tier';
import { roundPosition } from './editorial';
export function metadataReview(matches: Match[]) {
  const missing={exactDate:0,category:0,round:0,surface:0};
  const editions=new Map<string,{tournament:string;year:number;missing:Set<string>}>();
  for(const match of matches){
    const fields:string[]=[];
    if(match.context?.dateLabel!=='Fecha del partido'||!exactDay(match.context?.date)){missing.exactDate++;fields.push('fecha exacta');}
    if(!visibleTournamentCategory(match.category,match.tournament,match.year)){missing.category++;fields.push('categoría');}
    if(!match.round||(!roundPosition(match.round)&&!/^(RR|BR|ER)$/.test(match.round))){missing.round++;fields.push('ronda');}
    if(match.surface==='unknown'){missing.surface++;fields.push('superficie');}
    if(fields.length){const key=match.tournament+'|'+match.year;const item=editions.get(key)||{tournament:match.tournament,year:match.year,missing:new Set<string>()};fields.forEach(field=>item.missing.add(field));editions.set(key,item);}
  }
  return {missing,editions:[...editions.values()].sort((a,b)=>b.year-a.year||a.tournament.localeCompare(b.tournament)).map(item=>({...item,missing:[...item.missing]}))};
}
