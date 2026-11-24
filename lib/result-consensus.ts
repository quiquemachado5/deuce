import {createHash} from 'node:crypto'

export type ResultSource='valuebetennis'|'tennis-api-results'|'point-tennis'|'official'
export type ResultTour='atp'|'wta'
export type ResultObservation={
 schema:1
 source:ResultSource
 sourceUrl:string
 sourceId:string
 retrievedAt:string
 contentHash:string
 identity:string
 tour:ResultTour
 playedOn:string
 tournament:string
 level?:string
 round:number|null
 players:[string,string]
 winner:string
 score:string
 status:'completed'|'retired'|'walkover'|'defaulted'|'unknown'
 providerRow?:Record<string,unknown>
}
export type ConsensusStatus='confirmed'|'confirmed-official'|'provisional'|'conflict'|'pending'
export type ResultConsensusEntry={
 identity:string
 status:ConsensusStatus
 observations:ResultObservation[]
 accepted?:ResultObservation
 reason?:string
}

const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
const playerKey=(value:string)=>normalized(value).split(' ').filter(Boolean).sort().join(' ')
const scoreKey=(value:string)=>[...value.replace(/[\u2012-\u2015\u2212]/g,'-').matchAll(/(\d+)-(\d+)/g)].map(match=>`${Number(match[1])}-${Number(match[2])}`).join(' ')

function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical)
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]))
 return value
}

export function resultContentHash(value:unknown){return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')}

/** Date + circuit + both players is stable across providers with different tournament labels. */
export function resultIdentity(tour:ResultTour,playedOn:string,players:[string,string]){
 return [tour,playedOn.slice(0,10),...players.map(playerKey).sort()].join('|')
}

function observationsAgree(a:ResultObservation,b:ResultObservation){
 if(playerKey(a.winner)!==playerKey(b.winner))return false
 const first=scoreKey(a.score),second=scoreKey(b.score)
 return !first||!second||first===second
}

function preferred(observations:ResultObservation[]){
 return observations.find(row=>row.source==='official')||observations.find(row=>row.source==='tennis-api-results'&&row.providerRow)||observations.find(row=>row.providerRow)||observations[0]
}

export function resolveResultConsensus(observations:readonly ResultObservation[]):ResultConsensusEntry[]{
 const groups=new Map<string,ResultObservation[]>()
 for(const observation of observations)groups.set(observation.identity,[...(groups.get(observation.identity)||[]),observation])
 return [...groups.entries()].map(([identity,rows])=>{
  const unique=[...new Map(rows.map(row=>[`${row.source}:${row.sourceId}`,row])).values()]
  const official=unique.filter(row=>row.source==='official')
  if(official.length){
   if(official.some(row=>!observationsAgree(official[0],row)))return {identity,status:'conflict' as const,observations:unique,reason:'official-sources-disagree'}
   return {identity,status:'confirmed-official' as const,observations:unique,accepted:preferred(official)}
  }
  for(let first=0;first<unique.length;first++)for(let second=first+1;second<unique.length;second++){
   if(unique[first].source!==unique[second].source&&!observationsAgree(unique[first],unique[second]))return {identity,status:'conflict' as const,observations:unique,reason:'independent-sources-disagree'}
  }
  const agreeing=unique.filter((row,index)=>unique.some((candidate,candidateIndex)=>candidateIndex!==index&&candidate.source!==row.source&&observationsAgree(row,candidate)))
  if(agreeing.length>=2)return {identity,status:'confirmed' as const,observations:unique,accepted:preferred(agreeing)}
  return {identity,status:unique.length?'provisional' as const:'pending' as const,observations:unique,reason:'second-source-required'}
 }).sort((a,b)=>a.identity.localeCompare(b.identity))
}

export function mergeResultConsensus(previous:unknown,current:readonly ResultConsensusEntry[]){
 const saved=previous&&typeof previous==='object'&&Array.isArray((previous as {entries?:unknown}).entries)?(previous as {entries:ResultConsensusEntry[]}).entries:[]
 const observations=[...saved,...current].flatMap(entry=>Array.isArray(entry?.observations)?entry.observations:[]).filter(row=>row?.schema===1&&typeof row.identity==='string')
 return resolveResultConsensus(observations)
}

