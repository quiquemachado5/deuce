import type { Tour } from './types'

export type DetailCandidate = {
 kind:'modern'|'archive'; id:string; year:number; round:string; tour:Tour;
 players:readonly [string,string]
}
export const detailCandidateKey=(row:DetailCandidate)=>`${row.tour==='wta'?'wta-':''}${row.kind}-${row.id}`
const priority=(round:string)=>({F:0,Final:0,SF:1,Semifinal:1,QF:2,Quarterfinal:2,R16:3,'Round of 16':3}[round]??4)

type UnknownRow=Record<string,unknown>
const record=(value:unknown):UnknownRow|undefined=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as UnknownRow:undefined
const name=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim():undefined
const pair=(first:unknown,second:unknown):readonly [string,string]|undefined=>{
 const left=name(record(first)?.name),right=name(record(second)?.name)
 return left&&right?[left,right]:undefined
}

/** Extract the documented participants without guessing from labels or IDs. */
export function detailCandidatePlayers(value:unknown,kind:'modern'|'archive') {
 const row=record(value)
 if(!row)return undefined
 if(kind==='archive')return pair(row.winner,row.loser)
 const players=record(row.players)
 return pair(players?.p1,players?.p2)
}

const normalizedName=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
const samePlayers=(expected:readonly [string,string],actual:readonly [string,string])=>
 expected.map(normalizedName).sort().join('\n')===actual.map(normalizedName).sort().join('\n')

/** Reject crossed or malformed detail responses before they enter the archive. */
export function detailMatchesCandidate(candidate:DetailCandidate,payload:unknown) {
 const root=record(payload)
 if(!root)return false
 const body=record(root.match)||record(root.data)||root
 if(String(body.id??'')!==candidate.id)return false
 const players=detailCandidatePlayers(body,candidate.kind)
 if(!players||!samePlayers(candidate.players,players))return false
 const expectedGender=candidate.tour==='wta'?'women':'men'
 if(typeof body.gender==='string'&&body.gender!==expectedGender)return false
 if((body.tour==='atp'||body.tour==='wta')&&body.tour!==candidate.tour)return false
 if(candidate.kind==='modern'){
  const sides=record(body.players)
  for(const side of [record(sides?.p1),record(sides?.p2)]){
   if((side?.tour==='atp'||side?.tour==='wta')&&side.tour!==candidate.tour)return false
  }
 }
 return true
}
/** Rotate circuit and era queues so no source can starve another. */
export function enrichmentPlan(candidates:DetailCandidate[],known:ReadonlySet<string>,limit=90) {
 const unique=new Map<string,DetailCandidate>()
 for(const row of candidates){const key=detailCandidateKey(row);if(!known.has(key)&&!unique.has(key))unique.set(key,row)}
 const sort=(a:DetailCandidate,b:DetailCandidate)=>priority(a.round)-priority(b.round)||b.year-a.year||a.id.localeCompare(b.id)
 const queues=[
  [...unique.values()].filter(r=>r.tour==='atp'&&r.kind==='archive'&&r.year>=1991).sort(sort),
  [...unique.values()].filter(r=>r.tour==='wta'&&r.kind==='archive'&&r.year>=1991).sort(sort),
  [...unique.values()].filter(r=>r.tour==='atp'&&r.kind==='modern').sort(sort),
  [...unique.values()].filter(r=>r.tour==='wta'&&r.kind==='modern').sort(sort),
 ]
 const result:DetailCandidate[]=[]
 const offsets=queues.map(()=>0)
 while(result.length<limit&&queues.some((queue,index)=>offsets[index]<queue.length)) {
  for(let index=0;index<queues.length&&result.length<limit;index++){
   const row=queues[index][offsets[index]]
   if(row){result.push(row);offsets[index]++}
  }
 }
 return result
}
