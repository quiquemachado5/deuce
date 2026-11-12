import type {Match,Tour} from '../types';
export type ResearchCapability='results'|'exact-date'|'ranking-at-match'|'age-at-match'|'measured-statistics'|'observed-points'|'edition-census'|'dated-country'|'event-registry'|'elo-model'|'regulation-registry'|'verified-events'|'playing-hand'|'birth-date'|'event-window'|'known-match-format';
export type ResearchRow={entity:string;value:number;sample:number;detail?:string;proof:string[];from?:string;to?:string};
export type ResearchProduct={id:number;tour:Tour;definitionVersion:string;datasetVersion:string;status:'calculated-in-sample'|'blocked';required:ResearchCapability[];eligible:number;excluded:number;absoluteRecordEligible:false;limitations:string[];rows:ResearchRow[]};
export type ExternalEvidence={certifiedEditions?:ReadonlySet<string>;countries?:ReadonlyMap<string,string>;eventCountries?:ReadonlyMap<string,string>;currentEvents?:ReadonlySet<string>;series?:ReadonlyMap<string,string>;birthdays?:ReadonlyMap<string,string>;elo?:ReadonlyMap<string,number>;regulations?:ReadonlyMap<string,string>;verifiedEvents?:{tour:Tour;entity:string;value:number;detail?:string;proof:string[]}[];topTen?:ReadonlyMap<string,readonly string[]>;hands?:ReadonlyMap<string,'L'|'R'>;countryHistory?:ReadonlyMap<string,readonly {from:string;country:string}[]>;inactiveSince?:ReadonlyMap<string,string>;continents?:ReadonlyMap<string,string>;scheduledDates?:ReadonlyMap<string,string>;eventWindows?:ReadonlyMap<string,{start:string;end:string}>;eloVersion?:string};
export type Recipe={id:number;title:string;required:ResearchCapability[];calculate:(matches:Match[],evidence:ExternalEvidence)=>ResearchRow[]};
export const editionKey=(m:Match)=>[m.tour||'atp',m.tournament,m.category,m.year,m.context?.dateLabel==='Inicio del torneo'?m.context.date?.slice(0,10):''].join('|');
export const personKey=(tour:Tour,name:string)=>tour+'|'+name;
export const countryObservationKey=(m:Match,name:string)=>personKey(m.tour||'atp',name)+'|'+m.context?.date?.slice(0,10);
export const hasExactDate=(m:Match)=>m.context?.dateLabel==='Fecha del partido'&&/^\d{4}-\d{2}-\d{2}/.test(m.context.date||'');
export function eligibleFor(m:Match,capability:ResearchCapability,e:ExternalEvidence){
 switch(capability){
  case 'results':return m.winner===1||m.winner===2;
  case 'known-match-format':return (m.status||'').toLowerCase()==='finished'&& /^(?:BO[35]|best of [35](?: sets)?)$/i.test(m.context?.format?.trim()||'');
  case 'exact-date':return hasExactDate(m);
  case 'ranking-at-match':return m.context?.rankLabel==='Ranking al jugar'&&Number.isInteger(m.context.rank1)&&Number.isInteger(m.context.rank2)&&m.context.rank1!>0&&m.context.rank2!>0;
  case 'age-at-match':return Number.isFinite(m.context?.age1)&&Number.isFinite(m.context?.age2)&&(m.context?.age1??0)>0&&(m.context?.age2??0)>0;
  case 'measured-statistics':return m.statistics.length>0;
  case 'observed-points':return m.context?.pointSource==='observed'&&m.quality?.tape==='reliable'&&m.point_tape.length>0;
  case 'edition-census':return e.certifiedEditions?.has(editionKey(m))===true;
  case 'dated-country':return hasExactDate(m)&&e.countries?.has(countryObservationKey(m,m.player1.name))===true&&e.countries.has(countryObservationKey(m,m.player2.name));
  case 'event-registry':return e.series?.has(m.tournament)===true;
  case 'event-window':return hasExactDate(m)&&e.eventWindows?.has('Wimbledon|'+m.year)===true;
  case 'elo-model':return !!e.eloVersion&&e.elo?.has(m.match_id+'|'+m.player1.name)===true&&e.elo.has(m.match_id+'|'+m.player2.name);
  case 'regulation-registry':return e.regulations?.has(editionKey(m))===true;
  case 'playing-hand':return e.hands?.has(personKey(m.tour||'atp',m.player1.name))===true&&e.hands.has(personKey(m.tour||'atp',m.player2.name));
  case 'birth-date':return e.birthdays?.has(personKey(m.tour||'atp',m.player1.name))===true&&e.birthdays.has(personKey(m.tour||'atp',m.player2.name));
  case 'verified-events':return e.verifiedEvents?.some(event=>event.tour===(m.tour||'atp'))===true;
 }
}
