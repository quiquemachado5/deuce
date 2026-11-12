import type { Match, Tour } from './types';
import { eligibleMatch } from './quality';
import { chronological, roundPosition, winnerName } from './editorial';
import { browserRound } from './match-browser';
import { gamesInMatch, isDeciding, lostOpening, tiebreakCount } from './archive-insights';

export type RoundReading={key:string;label:string;matches:number;sets:number;games:number;deciding:number;comebacks:number;tiebreaks:number};
export function tournamentEditionStory(source:Match[],scope:{tournament:string;year:number;category:string;tour:Tour}){
  const matches=source.filter(match=>match.tournament===scope.tournament&&match.year===scope.year&&match.category===scope.category&&(match.tour||'atp')===scope.tour&&eligibleMatch(match));
  const read=(rows:Match[],key:string,label:string):RoundReading=>({key,label,matches:rows.length,sets:rows.reduce((sum,match)=>sum+match.score_summary.games.length,0),games:rows.reduce((sum,match)=>sum+gamesInMatch(match),0),deciding:rows.filter(isDeciding).length,comebacks:rows.filter(match=>lostOpening(match)).length,tiebreaks:rows.reduce((sum,match)=>sum+tiebreakCount(match),0)});
  const positions=[...new Set(matches.map(match=>roundPosition(match.round)))].sort((a,b)=>a-b);
  const rounds=[read(matches,'all','Toda la edición'),...positions.map(position=>{const rows=matches.filter(match=>roundPosition(match.round)===position);return read(rows,String(position),browserRound(rows[0]));})];
  const final=matches.find(match=>roundPosition(match.round)===7),champion=final?winnerName(final):null;
  const path=champion?matches.filter(match=>winnerName(match)===champion).sort((a,b)=>roundPosition(a.round)-roundPosition(b.round)||chronological(a,b)):[];
  const names=[...new Set(matches.flatMap(match=>[match.player1.name,match.player2.name]))];
  const leaders=names.map(name=>{
    const played=matches.filter(match=>match.player1.name===name||match.player2.name===name);
    let games=0,lostSets=0;
    for(const match of played){const side=match.player1.name===name?0:1;for(const set of match.score_summary.games){games+=set[side]-set[1-side];if(set[side]<set[1-side])lostSets++;}}
    return {name,wins:played.filter(match=>winnerName(match)===name).length,played:played.length,balance:games,lostSets};
  }).sort((a,b)=>b.wins-a.wins||b.balance-a.balance||a.name.localeCompare(b.name,'es')).slice(0,8);
  return {rounds,path,leaders};
}
