import 'server-only';
import {createHash} from 'node:crypto';
import seed from './official-records-seed.json';
import {acquireArchiveLease} from './archive-store';
import {cloudRead,cloudWrite} from './cloud-archive';
import type {Tour} from './types';
import {withOperationHistory} from './archive-operations';

export type OfficialRecordEvidence={id:string;tour:Tour;tournament:string;player:string;titles:number;source:string;publisher:string;capturedAt:string;throughYear?:number;contentHash?:string};
type EvidenceIndex=Record<string,OfficialRecordEvidence>;
const sources=[
  {id:'ao-atp',url:'https://ausopen.com/history/honour-roll/mens-singles',tour:'atp' as const,tournament:'Australian Open',publisher:'Australian Open',parser:'ao'},
  {id:'ao-wta',url:'https://ausopen.com/history/honour-roll/womens-singles',tour:'wta' as const,tournament:'Australian Open',publisher:'Australian Open',parser:'ao'},
  {id:'rg',url:'https://www.rolandgarros.com/en-us/palmares/',publisher:'Roland-Garros',parser:'rg'},
] as const;
const entities=(value:string)=>value.replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&apos;|&#39;/gi,"'").replace(/&quot;/gi,'"').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const safeName=(value:string)=>entities(value).replace(/\s+\([A-Z]{3}\)$/,'').trim();
let publishedCache:{until:number;value:Promise<OfficialRecordEvidence[]>}|undefined;

export function parseAustralianOpenLeader(html:string,source:typeof sources[0]|typeof sources[1],capturedAt:string):OfficialRecordEvidence{
  const match=html.match(/Most\s+Titles<\/label>\s*<span[^>]*>\s*(\d{1,2})\s*-\s*([^<]+)/i);
  if(!match)throw new Error('Australian Open leader was not found');
  const titles=Number(match[1]),player=safeName(match[2]);
  if(!Number.isSafeInteger(titles)||titles<2||titles>30||player.length<3)throw new Error('Australian Open leader is invalid');
  return {id:`ao-${source.tour}-titles`,tour:source.tour,tournament:source.tournament,player,titles,source:source.url,publisher:source.publisher,capturedAt};
}

function rolandGarrosLeader(html:string,tour:Tour,capturedAt:string):OfficialRecordEvidence{
  const className=tour==='atp'?'man-container':'woman-container';
  const start=html.search(new RegExp(`<section[^>]+class="[^"]*${className}`,'i'));
  const other=html.search(new RegExp(`<section[^>]+class="[^"]*${tour==='atp'?'woman-container':'man-container'}`,'i'));
  const end=other>start?other:html.indexOf('</main>',start);
  if(start<0||end<=start)throw new Error(`Roland-Garros ${tour} list was not found`);
  const segment=html.slice(start,end),counts=new Map<string,{titles:number;throughYear:number}>();
  const pattern=/<p[^>]+class="player-name"[^>]*>([\s\S]*?)<\/p>[\s\S]{0,500}?<p[^>]+class="year"[^>]*>\s*(\d{4})\s*<\/p>/gi;
  for(const match of segment.matchAll(pattern)){
    const player=safeName(match[1]),year=Number(match[2]);if(!player||/^no competition$/i.test(player))continue;
    const previous=counts.get(player)||{titles:0,throughYear:0};counts.set(player,{titles:previous.titles+1,throughYear:Math.max(previous.throughYear,year)});
  }
  const leader=[...counts].sort((a,b)=>b[1].titles-a[1].titles||b[1].throughYear-a[1].throughYear||a[0].localeCompare(b[0]))[0];
  if(!leader||leader[1].titles<2)throw new Error(`Roland-Garros ${tour} leader is invalid`);
  return {id:`rg-${tour}-titles`,tour,tournament:'Roland Garros',player:leader[0],titles:leader[1].titles,throughYear:leader[1].throughYear,source:sources[2].url,publisher:sources[2].publisher,capturedAt};
}

export function parseRolandGarrosLeaders(html:string,capturedAt:string){return [rolandGarrosLeader(html,'atp',capturedAt),rolandGarrosLeader(html,'wta',capturedAt)];}

export async function publishedOfficialRecords():Promise<OfficialRecordEvidence[]>{
  if(publishedCache&&publishedCache.until>Date.now())return publishedCache.value;
  const value=cloudRead('official-records').catch(()=>undefined).then(stored=>Object.values({...seed,...(stored?.evidence||{})} as EvidenceIndex).sort((a,b)=>a.tour.localeCompare(b.tour)||a.tournament.localeCompare(b.tournament)));
  publishedCache={until:Date.now()+10*60_000,value};return value;
}

/** A daily, serial and cached scrape. It stores small facts plus provenance, never third-party HTML. */
export async function refreshOfficialRecordEvidence(){
  const release=await acquireArchiveLease('official-records',120);if(!release)return {status:'busy',calls:0};
  try{
    const previous=await cloudRead('official-records').catch(()=>undefined),statusState=await cloudRead('official-records-status').catch(()=>undefined);
    const evidence:EvidenceIndex={...seed,...(previous?.evidence||{})},failures:string[]=[],capturedAt=new Date().toISOString();let calls=0;
    for(const source of sources){
      try{
        const response=await fetch(source.url,{headers:{'User-Agent':'DEUCEArchive/1.0 (+https://deucearchive.com/sobre-deuce; records verification)','Accept-Language':'en'},signal:AbortSignal.timeout(20_000),cache:'no-store'});calls++;
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        const html=await response.text();if(html.length<2_000||html.length>8_000_000)throw new Error('unexpected response size');
        const hash=createHash('sha256').update(html).digest('hex');
        const rows=source.parser==='ao'?[parseAustralianOpenLeader(html,source,capturedAt)]:parseRolandGarrosLeaders(html,capturedAt);
        for(const row of rows)evidence[`${row.tour}:${row.tournament}`]={...row,contentHash:hash};
      }catch(error){failures.push(`${source.id}: ${error instanceof Error?error.message:'unavailable'}`);}
      await new Promise(resolve=>setTimeout(resolve,750));
    }
    await cloudWrite('official-records',{schema:1,at:capturedAt,evidence});
    publishedCache={until:Date.now()+10*60_000,value:Promise.resolve(Object.values(evidence))};
    const status={status:failures.length===sources.length?'deferred':'success',at:capturedAt,calls,records:Object.keys(evidence).length,failures};
    await cloudWrite('official-records-status',withOperationHistory(statusState,status));return status;
  }finally{await release();}
}
