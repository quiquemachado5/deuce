import type { Match } from './types';
import { completeGames } from './point-integrity';
import { isRecordedTiebreak } from './historical-rules';
/** Missing winners remain unknown; never interpolate a score-only result. */
export function matchStory(match: Match) {
  const known = new Map(completeGames(match.point_tape,match).map(points=>[`${points[0].set}/${points[0].game}`,points]));
  return match.score_summary.games.map(([a,b],index)=>{
    const total=a+b, tie=isRecordedTiebreak(match,index);
    const games=Array.from({length:total},(_,i)=>{
      const points=known.get(`${index+1}/${i+1}`),last=points?.at(-1);
      return {number:i+1,winner:last?.winner ?? null,server:last?.server ?? null,tiebreak:tie&&i===total-1,
        isBreak:!!last?.server&&!!last.winner&&last.server!==last.winner&&!(tie&&i===total-1)};
    });
    const inconsistent=[1,2].some(side=>games.filter(g=>g.winner===side).length>[a,b][side-1]);
    if(inconsistent)for(const game of games){game.winner=null;game.server=null;game.isBreak=false;}
    return {set:index+1,score:[a,b],winner:(a>b?1:2) as 1|2,games,known:games.filter(g=>g.winner).length};
  });
}
