import registry from './reviewed-team-competition-scope.json';
import type{Match}from'./types';
const byId=new Map(registry.entries.map(row=>[row.matchId,row]));
const fold=(v:string)=>v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
/** Collision-resistant exact identity serialization, with unordered people for prepared canonical orientation. */
export function teamCompetitionFingerprint(match:Match){return JSON.stringify([match.tour||'atp',match.year,fold(match.tournament),match.context?.date?.slice(0,10)||'',match.round==='RR'?'Fase de grupos':match.round,[fold(match.player1.name),fold(match.player2.name)].sort()]);}
export function reviewedTeamCompetition(match:Match){
 const row=byId.get(match.match_id);
 return row&&[row.originalCategory,row.category].includes(match.category)&&row.fingerprint===teamCompetitionFingerprint(match)?row:undefined;
}
/** The raw archive is immutable; normalized rows retain their results under the reviewed team-event category. */
export function classifyReviewedTeamCompetition(match:Match):Match{
 const row=reviewedTeamCompetition(match);if(!row)return match;
 return {...match,category:row.category,context:{...match.context,metadataSources:[...(match.context?.metadataSources||[]).filter(source=>source.field!=='competición por equipos'),...row.sources.map(url=>({field:'competición por equipos',url}))]}};
}
