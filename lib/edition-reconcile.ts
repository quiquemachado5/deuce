import type { Match } from './types';
import { eligibleMatch, prepareMatch } from './quality';

const fold=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const key=(row:Match)=>`${row.tour||'atp'}:${row.year}:${row.match_id}`;
/** Saved terminal states count as documented outcomes, not as missing results. */
export function reconcileEditionSummaries(summaries: Match[], details: Match[]): Match[] {
  const validDetails = new Map(details.filter((row) => eligibleMatch(prepareMatch(row))||/^(retired|abandoned|walkover|cancelled|default)$/i.test(row.status)).map((row) => [key(row), row]));
  return summaries.map(row=>{
    const detail=validDetails.get(key(row));if(!detail)return row;
    const a=prepareMatch(row),b=prepareMatch(detail);
    const people=(m:Match)=>[fold(m.player1.name),fold(m.player2.name)].sort().join('|');
    return a.tournament===b.tournament&&a.round===b.round&&people(a)===people(b)?detail:row;
  });
}
