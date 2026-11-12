import wiki from '../player-wikimedia-context.json';
import {providerPlayerBiography} from '../player-bio';
import {personKey} from './contracts';
import type {Tour} from '../types';
type Subject={name:string;tour:Tour;birthday?:string;playingHand?:'L'|'R';revision:number;source:string;contestedFields?:string[]};
type ProviderBio={birthday?:string;hand?:'L'|'R'};
/** A field is usable only when provider biography and a pinned Wikidata revision agree.
 * Missing/conflicting fields stay missing; nationality is deliberately not backdated. */
export function corroboratedBiographies(subjects:readonly Subject[],provider:(name:string,tour:Tour)=>ProviderBio|undefined){
 const birthdays=new Map<string,string>(),hands=new Map<string,'L'|'R'>(),proofs:{person:string;field:string;value:string;sources:string[]}[]=[],conflicts:{person:string;field:string}[]=[];
 for(const subject of subjects){
  let url:URL;try{url=new URL(subject.source)}catch{continue}
  if(!Number.isSafeInteger(subject.revision)||subject.revision<=0||url.protocol!=='https:'||url.hostname!=='www.wikidata.org'||url.searchParams.get('oldid')!==String(subject.revision))continue;
  const bio=provider(subject.name,subject.tour),key=personKey(subject.tour,subject.name);if(!bio)continue;
  for(const [field,left,right] of [['birthday',subject.birthday,bio.birthday],['playingHand',subject.playingHand,bio.hand]] as const){
   if(!left||!right||subject.contestedFields?.includes(field))continue;
   if(left!==right){conflicts.push({person:key,field});continue}
   if(field==='birthday'){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(left)||!Number.isFinite(Date.parse(left))||new Date(left).toISOString().slice(0,10)!==left)continue;
    birthdays.set(key,left);
   }else{if(left!=='L'&&left!=='R')continue;hands.set(key,left)}
   proofs.push({person:key,field,value:left,sources:[subject.source,subject.tour==='atp'?'lib/player-bio-index.json':'lib/wta-player-bio.json']});
  }
 }
 return {birthdays,hands,proofs,conflicts};
}
export function reviewedBiographyEvidence(){return corroboratedBiographies(Object.values(wiki) as Subject[],providerPlayerBiography)}
