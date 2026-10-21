export type DetailCandidate = { kind:'modern'|'archive'; id:string; year:number; round:string }
const priority=(round:string)=>({F:0,Final:0,SF:1,Semifinal:1,QF:2,Quarterfinal:2,R16:3,'Round of 16':3}[round]??4)
/** Alternate historical and recent cohorts so neither can starve the other. */
export function enrichmentPlan(candidates:DetailCandidate[],known:ReadonlySet<string>,limit=90) {
 const unique=new Map<string,DetailCandidate>()
 for(const row of candidates){const key=`${row.kind}-${row.id}`;if(!known.has(key)&&!unique.has(key))unique.set(key,row)}
 const sort=(a:DetailCandidate,b:DetailCandidate)=>priority(a.round)-priority(b.round)||b.year-a.year||a.id.localeCompare(b.id)
 const historic=[...unique.values()].filter(r=>r.kind==='archive'&&r.year>=1991).sort(sort)
 const modern=[...unique.values()].filter(r=>r.kind==='modern').sort(sort)
 const result:DetailCandidate[]=[]
 let h=0,m=0
 while(result.length<limit&&(h<historic.length||m<modern.length)) {
  if(h<historic.length)result.push(historic[h++])
  if(result.length<limit&&m<modern.length)result.push(modern[m++])
 }
 return result
}
