import type { Match } from './types';
import { eligibleMatch } from './quality';
import { roundPosition, winnerName } from './editorial';

export function archiveStories(matches: Match[]) {
  const valid=matches.filter(match=>match.data_source!=='mock'&&eligibleMatch(match));
  const marathon=valid.find(m=>m.year===2010&&[m.player1.name,m.player2.name].includes('John Isner')&&[m.player1.name,m.player2.name].includes('Nicolas Mahut')&&m.score_summary.games.flat().reduce((a,b)=>a+b,0)===183);
  const comeback=valid.filter(m=>winnerName(m)==='Andy Murray'&&m.score_summary.games.length===5&&m.score_summary.games.slice(0,2).every(set=>set[m.winner!-1]<set[2-m.winner!])).sort((a,b)=>b.year-a.year)[0];
  const rivalry=valid.find(m=>m.year===2008&&m.tournament==='Wimbledon'&&roundPosition(m.round)===7&&[m.player1.name,m.player2.name].includes('Rafael Nadal')&&[m.player1.name,m.player2.name].includes('Roger Federer'));
  return [
    marathon?{id:'183-juegos',title:'183 juegos en un partido',text:'John Isner y Nicolas Mahut, Wimbledon 2010. La suma de los juegos de sus cinco sets alcanza 183.',match:marathon,record:'mas-juegos'}:null,
    rivalry?{id:'wimbledon-2008',title:'Una final, cinco sets',text:'Rafael Nadal y Roger Federer en la final de Wimbledon 2008. Explora el marcador y sus enfrentamientos antes y después de esa edición.',match:rivalry,record:'cinco-sets'}:null,
    comeback?{id:'murray-remontada',title:'Después de dos sets en contra',text:`Andy Murray ganó este partido de ${comeback.year} tras perder los dos primeros sets. El marcador completo permite seguir la remontada.`,match:comeback,record:'remontada-dos-sets'}:null,
  ].filter((story):story is NonNullable<typeof story>=>!!story);
}
