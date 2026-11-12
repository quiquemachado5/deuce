import type {Match,Tour} from './types';
import {exactDay} from './archive-freshness';

export type WikiPlayerContext={name:string;tour:Tour;entity:string;revision:number;source:string;checkedAt:string;birthday?:string;playingHand?:'L'|'R';backhand?:1|2;heightCm?:number;contestedFields?:string[];atpId?:string;wtaId?:string};
export type WikiContextIndex=Record<string,WikiPlayerContext>;
export type WikiPerson={name:string;tour:Tour;title?:string};
export const wikipediaPlayerTitles:Record<string,string>={'Barbara Jordan':'Barbara Jordan (tennis)','Chris Oneil':"Chris O'Neil (tennis)",'Kevin Anderson':'Kevin Anderson (tennis)','Ann Jones':'Ann Jones (tennis)','Na Li':'Li Na','Evonne Goolagong':'Evonne Goolagong Cawley','Mima Jausovec':'Mima Jaušovec','Kate Makarova':'Ekaterina Makarova','Shuai Peng':'Peng Shuai','Albert Ramos':'Albert Ramos Viñolas'};
const normalized=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
type Claim={rank?:string;mainsnak?:{datavalue?:{value:unknown}}};
type Entity={id:string;lastrevid:number;labels?:Record<string,{value:string}>;aliases?:Record<string,{value:string}[]>;claims?:Record<string,Claim[]>};
const claims=(entity:Entity,key:string)=>(entity.claims?.[key]||[]).filter(claim=>claim.rank!=='deprecated').map(claim=>claim.mainsnak?.datavalue?.value);
export function acceptedWikiContext(person:WikiPerson,entity:Entity,at=new Date().toISOString()):WikiPlayerContext|undefined{
  const names=[...Object.values(entity.labels||{}),...Object.values(entity.aliases||{}).flat()].map(row=>normalized(row.value));
  if(!names.includes(normalized(person.name))&&!names.includes(normalized(person.title||person.name)))return;
  const occupations=claims(entity,'P106') as {id?:string}[],sports=claims(entity,'P641') as {id?:string}[];
  const atpId=claims(entity,'P536').find(value=>typeof value==='string') as string|undefined;
  const wtaId=claims(entity,'P597').find(value=>typeof value==='string') as string|undefined;
  if(!occupations.some(value=>value?.id==='Q10833314')&&!sports.some(value=>value?.id==='Q847')&&!atpId&&!wtaId)return;
  const genders=claims(entity,'P21') as {id?:string}[];
  // The circuit ID or an unambiguous sporting biography must corroborate the identity.
  if(person.tour==='atp'?!atpId&&!genders.some(value=>value?.id==='Q6581097'):!wtaId&&!genders.some(value=>value?.id==='Q6581072'))return;
  if(!/^Q\d+$/.test(entity.id)||!Number.isSafeInteger(entity.lastrevid))return;
  const validDay=(value:string)=>{const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.valueOf())&&date.toISOString().startsWith(value);};
  const birthdays=[...new Set((claims(entity,'P569') as {time?:string;precision?:number}[]).filter(value=>(value.precision||0)>=11).map(value=>value.time?.match(/^\+(\d{4}-\d{2}-\d{2})T/)?.[1]).filter((value):value is string=>!!value&&validDay(value)))];
  // P741 describes tennis play. General handedness (P552) is not a playing hand.
  const playing=(claims(entity,'P741') as {id?:string}[]).map(value=>value?.id);
  const hands=[...new Set(playing.map(id=>id==='Q789447'?'L':id==='Q3039938'?'R':undefined).filter((hand):hand is 'L'|'R'=>!!hand))];
  const backhands=[...new Set(playing.map(id=>id==='Q14420039'?1:id==='Q14420068'?2:undefined).filter((hand):hand is 1|2=>!!hand))];
  const heights=[...new Set((claims(entity,'P2048') as {amount?:string;unit?:string}[]).map(value=>{
    const amount=Number(value?.amount),unit=value?.unit?.split('/').at(-1);
    const cm=unit==='Q174728'?amount:unit==='Q11573'?amount*100:NaN;
    return Number.isFinite(cm)&&cm>=140&&cm<=230?Math.round(cm*10)/10:undefined;
  }).filter((height):height is number=>height!==undefined))];
  const contestedFields=[['birthday',birthdays],['playingHand',hands],['backhand',backhands],['heightCm',heights]].filter(([,values])=>values.length>1).map(([field])=>field as string);
  return {name:person.name,tour:person.tour,entity:entity.id,revision:entity.lastrevid,source:`https://www.wikidata.org/w/index.php?oldid=${entity.lastrevid}`,checkedAt:at,...(birthdays.length===1?{birthday:birthdays[0]}:{}),...(hands.length===1?{playingHand:hands[0]}:{}),...(backhands.length===1?{backhand:backhands[0]}:{}),...(heights.length===1?{heightCm:heights[0]}:{}),...(contestedFields.length?{contestedFields}:{}),...(atpId?{atpId}:{}),...(wtaId?{wtaId}:{})};
}

/** Differences are review candidates, never instructions to overwrite the provider. */
export function compareWikiBiography(context:WikiPlayerContext,provider:{birthday?:string;hand?:'L'|'R';backhand?:1|2}){
  return ([['birthday',context.birthday,provider.birthday],['playingHand',context.playingHand,provider.hand],['backhand',context.backhand,provider.backhand]] as const)
    .filter(([,value])=>value!==undefined)
    .map(([field,value,existing])=>({field,value,provider:existing??null,state:existing===undefined?'missing-provider':existing===value?'matched':'conflict',source:context.source}));
}

/** Public Wikimedia reads are batched, serial and budgeted; no request is made by page visitors. */
export async function fetchWikiContexts(people:WikiPerson[],previous:WikiContextIndex={},options:{maximumRequests?:number;fetcher?:typeof fetch;pauseMs?:number}={}){
  people=people.map(person=>({...person,title:person.title||wikipediaPlayerTitles[person.name]}));
  const fetcher=options.fetcher||fetch,maximum=Math.max(0,Math.min(30,options.maximumRequests??4));let calls=0;
  const contexts={...previous},unresolved:string[]=[];
  const request=async(host:string,parameters:Record<string,string>)=>{
    if(calls>=maximum)throw new Error('Wikimedia request budget reached');
    calls++;
    const response=await fetcher(host+'?'+new URLSearchParams({...parameters,format:'json',maxlag:'5'}),{headers:{'User-Agent':'DEUCEArchive/1.0 (https://deucearchive.com/sobre-deuce; biography context)'},signal:AbortSignal.timeout(12_000)});
    if(!response.ok)throw new Error(`Wikimedia HTTP ${response.status}`);
    const body=await response.json();if(body.error)throw new Error('Wikimedia deferred: '+String(body.error.code));return body;
  };
  let error:string|undefined;
  for(let offset=0;offset<people.length&&calls+2<=maximum;offset+=20){
    const batch=people.slice(offset,offset+20);
    try{
      const pages=await request('https://en.wikipedia.org/w/api.php',{action:'query',prop:'pageprops',ppprop:'wikibase_item',redirects:'1',titles:batch.map(person=>person.title||person.name).join('|')});
      const redirects=pages.query?.redirects||[];
      const entities=(Object.values(pages.query?.pages||{}) as {title:string;pageprops?:{wikibase_item?:string}}[]);
      const ids=entities.map(page=>page.pageprops?.wikibase_item).filter(Boolean);
      if(!ids.length){unresolved.push(...batch.map(person=>person.tour+':'+person.name));continue;}
      const data=await request('https://www.wikidata.org/w/api.php',{action:'wbgetentities',props:'info|claims|labels|aliases',languages:'en|es|mul',ids:ids.join('|')});
      for(const person of batch){
        const requested=normalized(person.title||person.name),redirect=redirects.find((row:{from:string;to:string})=>normalized(row.from)===requested);
        const page=entities.find(page=>normalized(page.title)===normalized(redirect?.to||requested));
        const entity=page?.pageprops?.wikibase_item&&data.entities?.[page.pageprops.wikibase_item];
        const context=entity?acceptedWikiContext(person,entity):undefined;
        if(context)contexts[person.tour+':'+person.name]=context;else unresolved.push(person.tour+':'+person.name);
      }
      if(options.pauseMs)await new Promise(resolve=>setTimeout(resolve,Math.min(5000,options.pauseMs!)));
    }catch(problem){error=problem instanceof Error?problem.message:'Wikimedia unavailable';break;}
  }
  return {contexts,calls,unresolved,...(error?{error}:{})};
}

/** Birth dates only fill missing ages on exact match dates; provider values always win. */
export function enrichMatchAges(matches:Match[],contexts:WikiContextIndex):Match[]{
  return matches.map(match=>{
    if(match.context?.dateLabel!=='Fecha del partido')return match;
    const date=exactDay(match.context.date);if(!date)return match;
    let context=match.context;
    for(const [side,player]of [[1,match.player1],[2,match.player2]] as const){
      const field=side===1?'age1':'age2';if(context?.[field]!=null)continue;
      const bio=contexts[(match.tour||'atp')+':'+player.name];if(!bio?.birthday)continue;
      const year=Number(date.slice(0,4))-Number(bio.birthday.slice(0,4)),age=year-Number(date.slice(5)<bio.birthday.slice(5));
      if(age<12||age>65)continue;
      context={...context,[field]:age,metadataSources:[...(context?.metadataSources||[]),{field,url:bio.source}]};
    }
    return context===match.context?match:{...match,context};
  });
}
