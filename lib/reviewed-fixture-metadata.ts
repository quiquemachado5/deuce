import decisions from './reviewed-fixture-metadata.json';
import type {Match} from './types';
const fold=(name:string)=>name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
/** Exact identities prevent a reviewed edition fact leaking across years, people or circuits. */
export function reviewedFixtureMetadataDecision(match:Match){
 return decisions.find(row=>row.matchId===match.match_id&&row.tour===(match.tour||'atp')&&row.year===match.year&&row.tournament===match.tournament&&row.date===match.context?.date?.slice(0,10)&&[row.round,row.correctedRound].includes(match.round)&&
  ((fold(row.first)===fold(match.player1.name)&&fold(row.second)===fold(match.player2.name))||(fold(row.second)===fold(match.player1.name)&&fold(row.first)===fold(match.player2.name))));
}
/** Correct documented competition/round metadata; the recorded result is never rewritten. */
export function reviewedFixtureMetadata(match:Match):Match{
 const row=reviewedFixtureMetadataDecision(match);if(!row)return match;
 const urls=[row.source,row.corroboration,...(row.evidence||[])];
 return {...match,round:row.correctedRound,context:{...match.context,
  ...(row.qualifying?{qualifying:true,format:'BO3'}:{}),
  metadataSources:[...(match.context?.metadataSources||[]).filter(source=>source.field!=='ronda revisada'),...urls.map(url=>({field:'ronda revisada',url}))],
 }};
}
