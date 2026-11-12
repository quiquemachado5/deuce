import type {Match} from '../types';
import {eligibleFor} from './contracts';

const capabilities=['exact-date','ranking-at-match','measured-statistics','observed-points','known-match-format'] as const;
type Field=typeof capabilities[number]|'duration'|'surface';
const fields:Field[]=[...capabilities,'duration','surface'];
type Cohort={dimension:string;key:string;matches:number;available:Record<Field,number>};
/** Availability within published matches is not coverage of the historical circuit.
 * Every cohort keeps the full denominator, including rows without enrichment. */
export function auditAvailability(matches:readonly Match[]){
 const groups=new Map<string,Cohort>();
 for(const match of matches){
  const tour=match.tour||'atp';
  const observed=Object.fromEntries(fields.map(field=>[field,field==='duration'?Number.isFinite(match.context?.minutes)&&(match.context?.minutes??0)>0:field==='surface'?match.surface!=='unknown':eligibleFor(match,field,{})]));
  const keys:[string,string][]=[['tour',tour],['year',`${tour}|${match.year}`],['category',`${tour}|${match.category}`],['round',`${tour}|${match.round}`],['player',`${tour}|${match.player1.name}`],['player',`${tour}|${match.player2.name}`]];
  for(const [dimension,key] of keys){
   const id=JSON.stringify([dimension,key]);
   let cohort=groups.get(id);
   if(!cohort){cohort={dimension,key,matches:0,available:Object.fromEntries(fields.map(field=>[field,0])) as Record<Field,number>};groups.set(id,cohort)}
   cohort.matches++;for(const field of fields)if(observed[field])cohort.available[field]++;
  }
 }
 return {schema:1,fields,limitations:['Denominators contain published matches only, not all historical matches.','Player rows count appearances; do not sum them as matches.','Missing enrichment is not evidence of zero performance.','Availability differences describe selection bias; they do not estimate missing results.'],cohorts:[...groups.values()].sort((a,b)=>a.dimension.localeCompare(b.dimension)||a.key.localeCompare(b.key))};
}
