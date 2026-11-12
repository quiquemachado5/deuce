import type {Match} from '../types';
import {normalizeText} from '../quality';
import {canonicalMatchId} from '../match-identity-aliases';

export type CompactMatchSelection={
 tour?:'atp'|'wta'|'all';fromYear?:number;toYear?:number;players?:string[];
 tournament?:string;rounds?:string[];categories?:string[];ids?:string[];surface?:Match['surface'];
};
const names=(values:string[]|undefined)=>values?Array.from(new Set(values.map(normalizeText))).sort():undefined;
/** Field order and set order must not multiply caches for an equivalent selection. */
export function normalizedCompactSelection(selection:CompactMatchSelection){
 return {
  tour:selection.tour||'all',fromYear:selection.fromYear,toYear:selection.toYear,
  players:names(selection.players),tournament:selection.tournament?normalizeText(selection.tournament):undefined,
  rounds:names(selection.rounds),categories:names(selection.categories),
  ids:selection.ids?Array.from(new Set(selection.ids.map(canonicalMatchId))).sort():undefined,
  surface:selection.surface,
 };
}
