import {comparisonCanonical} from './comparison-canonical';

/** Deliberate editorial selection; arbitrary pairs and filters stay out of search. */
export const CURATED_COMPARISONS = [
  {tour:'atp',a:'Roger Federer',b:'Rafael Nadal'},
  {tour:'atp',a:'Novak Djokovic',b:'Rafael Nadal'},
  {tour:'atp',a:'Roger Federer',b:'Novak Djokovic'},
  {tour:'atp',a:'Carlos Alcaraz',b:'Jannik Sinner'},
  {tour:'atp',a:'Pete Sampras',b:'Andre Agassi'},
  {tour:'wta',a:'Serena Williams',b:'Venus Williams'},
  {tour:'wta',a:'Martina Navratilova',b:'Chris Evert'},
  {tour:'wta',a:'Steffi Graf',b:'Monica Seles'},
] as const;
export function curatedComparison(query:Record<string,string|undefined>){
  // Only the exact unfiltered canonical entity is indexable.
  if(Object.entries(query).some(([key,value])=>value&&!['a','b','tour'].includes(key)))return undefined;
  const canonical=comparisonCanonical(query);
  return CURATED_COMPARISONS.find(pair=>comparisonCanonical(pair)===canonical);
}
