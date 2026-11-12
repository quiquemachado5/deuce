import type {Match} from './types';
// Same city does not establish event identity. These joint events share a venue/event
// lineage; circuit switching additionally requires the same category family in the data.
const sharedEvents=new Set(['australian-open','roland-garros','wimbledon','us-open','indian-wells','miami','madrid','rome','canada','cincinnati','washington','eastbourne']);
const family=(category:string)=>category==='Grand Slam'?'slam':category.match(/1000|500|250|125/)?.[0]||category;
export function tournamentArchiveOptions(slug:string,matches:Match[],category:string,selectedTour:'atp'|'wta'=/^WTA /.test(category)?'wta':'atp'){
 return (['atp','wta'] as const).flatMap(tour=>{
  if(tour!==selectedTour&&!sharedEvents.has(slug))return [];
  const rows=matches.filter(m=>(m.tour||'atp')===tour&&(tour===selectedTour?m.category===category:family(m.category)===family(category)));
  if(!rows.length)return [];
  const target=rows[0].category,params=new URLSearchParams({cuadro:tour,categoria:target});
  const years=[...new Set(rows.map(m=>m.year))].sort((a,b)=>b-a);
  return [{tour,summaryHref:`/torneos/${slug}?${params}`,editions:years.map(year=>({year,href:`/torneos/${slug}/${year}?${params}`}))}];
 });
}
