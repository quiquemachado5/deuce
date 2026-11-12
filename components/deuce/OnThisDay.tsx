import {roundPosition} from '@/lib/editorial';
import {lostOpening,isDeciding} from '@/lib/archive-insights';
import type { Match } from '@/lib/types';
import { winnerName } from '@/lib/editorial';
import { playerPhoto } from '@/lib/player-imagery';
import { homePlayerPhoto } from '@/lib/home-media';
import { tournamentName } from '@/lib/labels';
import { browserRound } from '@/lib/match-browser';
import { tieBreakPoints } from '@/lib/score-display';
import { playerBiography } from '@/lib/player-bio';
import { canonicalName } from '@/lib/quality';
import { OnThisDayFeature, type OnThisDayStory } from './OnThisDayFeature';

export function OnThisDay({ match, matches = [] }: { match?:Match; matches?:Match[] }) {
  const today=new Date().toISOString().slice(5,10);
  const stories:OnThisDayStory[]=[...(match?[match]:[]),...matches]
    .filter((item,index,items)=>item.context?.dateLabel==='Fecha del partido'&&item.context.date?.slice(5,10)===today&&winnerName(item)&&items.findIndex(candidate=>candidate.match_id===item.match_id)===index)
    .filter(item=>!(today==='11-10'&&item.year===2013&&[item.player1.name,item.player2.name].includes('Rafael Nadal')&&[item.player1.name,item.player2.name].includes('Roger Federer')))
    .sort((a,b)=>roundPosition(b.round)-roundPosition(a.round)||Number(isDeciding(b))-Number(isDeciding(a))).slice(0,2)
    .map(item=>{
      const winner=winnerName(item)!;
      const loser=item.player1.name===winner?item.player2.name:item.player1.name;
      const tieBreaks=tieBreakPoints(item);
      const games=[...item.score_summary.games,...(item.score_summary.match_tiebreak?[item.score_summary.match_tiebreak]:[])];
      const result=games.map((set,index)=>`${(item.winner===1?set:[...set].reverse()).join('–')}${tieBreaks[index]?`(${tieBreaks[index]})`:''}`).join(', ');
      const highlight=roundPosition(item.round)===7||isDeciding(item)||lostOpening(item);
      const photo=homePlayerPhoto(winner)||playerPhoto(winner,item.tour||'atp');
      return {
        id:item.match_id,
        kind:roundPosition(item.round)===7?'title' as const:'match' as const,
        surface:item.surface,
        score:result,
        players:[item.player1,item.player2].map((player,side)=>({sets:games.map(set=>set[side]),name:canonicalName(player.name),won:player.name===winner,country:playerBiography(player.name,item.tour||'atp')?.country,photo:homePlayerPhoto(player.name)||playerPhoto(player.name,item.tour||'atp')||undefined})),
        headline:roundPosition(item.round)===7?`${canonicalName(winner)} conquista ${tournamentName(item.tournament)} ante ${canonicalName(loser)}`:`${canonicalName(winner)} ${lostOpening(item)?'remonta ante':'vence a'} ${canonicalName(loser)} en ${browserRound(item).toLocaleLowerCase('es')} de ${tournamentName(item.tournament)}`,
        detail: highlight?`Ganó a ${canonicalName(loser)} por ${result}.`:`Marcador: ${result}.`,
        year:item.year,
        date:item.context!.date!.slice(0,10),
        context:`${(item.tour||'atp').toUpperCase()} · ${tournamentName(item.tournament)} · ${browserRound(item)}`,
        photo:photo?{src:photo.src,alt:photo.alt,objectPosition:photo.objectPosition,mobileObjectPosition:photo.mobileObjectPosition}:undefined,
      };
    });
  if(today==='11-10'){
    const photo=homePlayerPhoto('Rafael Nadal');
    stories.unshift({kind:'event',id:'history-2013-nadal-first-finals-federer',year:2013,date:'2013-11-10',context:'ATP Finals · Londres',headline:'Nadal rompe la barrera ante Federer',detail:'Su primera victoria ante Federer en las ATP Finals, después de cuatro derrotas. En Londres alcanza su decimocuarta final de la temporada.',source:{name:'ATP Tour',href:'https://www.atptour.com/es/news/rivalries-federer-nadal'},photo:photo||undefined});
  }
  const [lead,...rest]=stories;
  const next=rest.find(story=>story.year!==lead?.year)||rest[0];
  return lead?<OnThisDayFeature stories={next?[lead,next]:[lead]}/>:null;
}
