import type {Tour} from './types';
export type FinalsProviderRow={tour?:unknown;tier?:unknown;level?:unknown;tournament?:unknown;tournament_id?:unknown;event_date?:unknown;scheduled_time?:unknown;source_id?:unknown};
const fold=(value:unknown)=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
/** Exact event identities, not a substring match on "championships" or a city. */
export function finalsIdentity(row:FinalsProviderRow):{tour:Tour;category:string;tournament:string;season:number}|null{
 const tour=row.tour==='wta'?'wta':row.tour==='atp'?'atp':null;if(!tour)return null;
 const name=fold(row.tournament),tier=fold(row.tier);
 const season=Number(String(row.source_id||'').match(/^(?:atp|wta):(\d{4})-/)?.[1]||String(row.scheduled_time||row.event_date||'').slice(0,4));
 if(!Number.isInteger(season)||season<1970||season>new Date().getUTCFullYear())return null;
 if(tour==='atp'){
  const december1986=name==='masters dec'&&row.level==='M'&&/^atp:1986-605:/.test(String(row.source_id||''));
  if(!(tier==='atp_finals'||(['tour finals','masters cup'].includes(name)&&row.level==='F')||(name==='masters'&&row.level==='M'&&season<=1989)||december1986))return null;
  return {tour,season,category:'ATP Finals',tournament:'ATP Finals'};
 }
 if(season<1972)return null;
 const historic=['wta tour championships','wta championships','virginia slims championships','virginia slims championships 1','virginia slims championships 2','avon championships','fort worth finals','shenzhen finals','wta finals','guadalajara finals'];
 const singapore=name==='singapore'&&row.level==='F'&&season>=2015&&season<=2018;
 const riyadh2026=season===2026&&String(row.tournament_id)==='3195'&&name==='finals - riyadh'&&String(row.scheduled_time||'').slice(0,10)>='2026-11-01'&&String(row.scheduled_time||'').slice(0,10)<='2026-11-30';
 // The provider files the first three championships as ordinary tour events.
 // Reviewed source IDs avoid treating every tournament in those cities as Finals.
 const earlyChampionship=/^wta:(1972-1038|1973-1047|1974-1027):/.test(String(row.source_id||''))&&row.level==='W'&&['boca raton','los angeles'].includes(name);
 if(!(tier==='wta_finals'||historic.includes(name)||singapore||riyadh2026||earlyChampionship))return null;
 // Two official championships were held in 1986. Never collapse them into one final.
 const march1986=season===1986&&String(row.event_date||'').slice(5,7)==='03';
 return {tour,season,category:'WTA Finals',tournament:march1986?'WTA Finals · marzo de 1986':'WTA Finals'};
}
