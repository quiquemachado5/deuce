import type { Tour } from './types'

export type DetailCandidate = { kind:'modern'|'archive'; id:string; year:number; round:string; tour:Tour }
export const detailCandidateKey=(row:DetailCandidate)=>`${row.tour==='wta'?'wta-':''}${row.kind}-${row.id}`
const priority=(round:string)=>({F:0,Final:0,SF:1,Semifinal:1,QF:2,Quarterfinal:2,R16:3,'Round of 16':3}[round]??4)
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
