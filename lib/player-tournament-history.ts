import { roundPosition } from './editorial';
import { playerIdentity } from './explore';
import type { Match, Tour } from './types';

export type CareerOutcome = 'title' | 'final' | 'semi' | 'quarter' | 'r16' | 'r32' | 'r64' | 'r128' | 'group' | 'other';
export type CareerEdition = {year:number;outcome:CareerOutcome;label:string;code:string;category:string};

/** Only documented appearances count. A blank year never asserts an absence. */
export function playerTournamentEditions(matches:readonly Match[],name:string,tour:Tour):CareerEdition[] {
  const identity=playerIdentity(name,tour);
  const years=new Map<number,Match[]>();
  for(const match of matches){
    if((match.tour||'atp')!==tour||![match.player1.name,match.player2.name].some(player=>playerIdentity(player,tour)===identity))continue;
    const year=years.get(match.year)||[];year.push(match);years.set(match.year,year);
  }
  return [...years].sort((a,b)=>a[0]-b[0]).map(([year,rows])=>{
    const best=[...rows].sort((a,b)=>roundPosition(b.round)-roundPosition(a.round))[0];
    const position=roundPosition(best.round);
    const won=best.winner===1?playerIdentity(best.player1.name,tour)===identity:best.winner===2?playerIdentity(best.player2.name,tour)===identity:false;
    const outcome:CareerOutcome=position===7?(won?'title':'final'):position===6?'semi':position===5?'quarter':position===4?'r16':position===3?'r32':position===2?'r64':position===1?'r128':/round robin|fase de grupos|^rr$/i.test(best.round)?'group':'other';
    const names:Record<CareerOutcome,[string,string]>={title:[tour==='wta'?'Ganadora':'Ganador','G'],final:['Final','F'],semi:['Semifinal','SF'],quarter:['Cuartos','CF'],r16:['Octavos','R16'],r32:['Ronda de 32','R32'],r64:['Ronda de 64','R64'],r128:['Ronda de 128','R128'],group:['Fase de grupos','RR'],other:['Participación','P']};
    return {year,outcome,label:names[outcome][0],code:names[outcome][1],category:best.category||'Otros torneos'};
  });
}
