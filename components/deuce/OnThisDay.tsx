import type { Match } from '@/lib/types';
import { winnerName, scoreFor } from '@/lib/editorial';
import { playerPhoto } from '@/lib/player-imagery';
import { tournamentName } from '@/lib/labels';
import { browserRound } from '@/lib/match-browser';
import { canonicalName } from '@/lib/quality';
import { OnThisDayCarousel, type OnThisDayStory } from './OnThisDayCarousel';

export function OnThisDay({ match, matches = [] }: { match?:Match; matches?:Match[] }) {
  if(!match)return null;
  const stories:OnThisDayStory[]=[match,...matches]
    .filter((item,index,items)=>items.findIndex(candidate=>candidate.match_id===item.match_id)===index)
    .map(item=>{
      const winner=winnerName(item)!;
      const loser=item.player1.name===winner?item.player2.name:item.player1.name;
      const photo=playerPhoto(winner);
      return {
        id:item.match_id,
        year:item.year,
        date:new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(item.context!.date!)),
        context:`${tournamentName(item.tournament)} · ${browserRound(item)}`,
        winner:canonicalName(winner),
        loser:canonicalName(loser),
        score:scoreFor(item,winner),
        photo:photo?{src:photo.src,thumbnail:photo.thumbnail,alt:photo.alt,objectPosition:photo.objectPosition,mobileObjectPosition:photo.mobileObjectPosition}:undefined,
      };
    });
  return <OnThisDayCarousel stories={stories}/>;
}
