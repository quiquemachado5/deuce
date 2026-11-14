import {isDeepStrictEqual} from 'node:util';
import {publicMatchFacts} from './publication-pages';
import type {Match} from './types';
export type PublicationChangeTypes={results:number;ranking:number;statistics:number;points:number;metadata:number};
export const emptyChangeTypes=():PublicationChangeTypes=>({results:0,ranking:0,statistics:0,points:0,metadata:0});
/** One principal reason per updated existing record; additions are reported separately. */
export function classifyPublicationChanges(before:Match[],after:Match[],updated?:Set<string>):PublicationChangeTypes{
 const prior=new Map(before.map(match=>[`${match.tour||'atp'}:${match.match_id}`,match])),counts=emptyChangeTypes();
 for(const match of after){const id=`${match.tour||'atp'}:${match.match_id}`,old=prior.get(id);if(!old||updated&&!updated.has(id)||isDeepStrictEqual(old,match))continue;
  if(!isDeepStrictEqual(publicMatchFacts(old),publicMatchFacts(match)))counts.results++;
  else if(!isDeepStrictEqual([old.context?.rank1,old.context?.rank2,old.context?.rankLabel],[match.context?.rank1,match.context?.rank2,match.context?.rankLabel]))counts.ranking++;
  else if(!isDeepStrictEqual(old.statistics,match.statistics))counts.statistics++;
  else if(!isDeepStrictEqual(old.point_tape,match.point_tape))counts.points++;
  else counts.metadata++;
 }
 return counts;
}
