import registry from './reviewed-historical-editions.json';
import type{Match}from'./types';
const fold=(v:string)=>v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^rainerschuettler$/,'rainerschuttler');
const byId=new Map(registry.editions.flatMap(edition=>edition.entries.map(entry=>[entry.matchId,{edition,entry}]as const)));
/** Full-edition inclusion is gated by reviewed source identities, never by famous player names. */
export function reviewedHistoricalEdition(match:Match){
 const reviewed=byId.get(match.match_id);if(!reviewed)return undefined;const{edition,entry}=reviewed;
 return edition.tour===(match.tour||'atp')&&edition.year===match.year&&edition.tournament===match.tournament&&[edition.originalCategory,edition.category].includes(match.category)&&entry.date===match.context?.date?.slice(0,10)&&entry.round===match.round&&JSON.stringify(entry.people.map(fold).sort())===JSON.stringify([fold(match.player1.name),fold(match.player2.name)].sort())?edition:undefined;
}
export function classifyReviewedHistoricalEdition(match:Match):Match{
 const edition=reviewedHistoricalEdition(match);if(!edition)return match;
 return{...match,category:edition.category,context:{...match.context,metadataSources:[...(match.context?.metadataSources||[]).filter(s=>s.field!=='categoría histórica revisada'),...[edition.source,edition.categorySource,edition.corroboration].map(url=>({field:'categoría histórica revisada',url}))]}};
}
/** Filtering can group the documented predecessor without overwriting its historical name. */
export function matchesCompetitionCategory(match:Match,category:string){return match.category===category||reviewedHistoricalEdition(match)?.modernEquivalent===category;}

/** Certification requires every reviewed fixture identity, not merely a matching row count. */
export function reviewedHistoricalEditionCoverage(matches:Match[]){
 if(!matches.length)return undefined;const edition=reviewedHistoricalEdition(matches[0]);if(!edition||matches.length!==edition.entries.length)return undefined;
 const ids=new Set(matches.map(m=>m.match_id));if(ids.size!==edition.entries.length||!edition.entries.every(row=>ids.has(row.matchId))||!matches.every(m=>reviewedHistoricalEdition(m)===edition))return undefined;
 return{drawSize:edition.drawSize,drawSizeSource:edition.source,expectedRounds:edition.expectedRounds};
}
