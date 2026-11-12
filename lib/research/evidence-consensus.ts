import {createHash} from 'node:crypto';
export type EvidenceObservation={claim:string;value:unknown;publisher:string;origin:string;url:string;capturedAt:string;sha256:string;revisionId?:number;effectiveAt?:string;inheritedOrigins?:string[]};
const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)])):value;
const fingerprint=(value:unknown)=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
/** Three pages copying one feed are one origin. Conflicts remain visible and block certification. */
export function evidenceConsensus(observations:readonly EvidenceObservation[],claim:string){
 const rejected:string[]=[],groups=new Map<string,EvidenceObservation[]>();
 for(const row of observations.filter(row=>row.claim===claim)){
  let valid=false;try{const url=new URL(row.url);valid=url.protocol==='https:'&&!url.username&&!url.password&&!!row.publisher.trim()&&!!row.origin.trim()&&/^[a-f0-9]{64}$/.test(row.sha256)&&Number.isFinite(Date.parse(row.capturedAt))&&(!url.hostname.endsWith('wikipedia.org')||Number.isSafeInteger(row.revisionId)&&row.revisionId!>0)}catch{}
  if(!valid){rejected.push(row.url);continue}
  const key=fingerprint(row.value);groups.set(key,[...(groups.get(key)||[]),row]);
 }
 const candidates=[...groups].map(([valueHash,rows])=>{
  const roots=new Set(rows.flatMap(row=>row.inheritedOrigins?.length?row.inheritedOrigins:[row.origin]));
  const publishers=new Set(rows.map(row=>row.publisher));
  // An independent witness must have one root; a page aggregating many origins
  // does not supply several votes merely by listing their names.
  const edges=new Map<string,Set<string>>();
  for(const row of rows.filter(row=>(row.inheritedOrigins?.length||1)===1)){
   const root=row.inheritedOrigins?.[0]||row.origin;
   edges.set(root,new Set([...(edges.get(root)||[]),row.publisher]));
  }
  // Match distinct origins to distinct publishers; one publisher cannot cast
  // several votes while two mirrors merely repeat its first source.
  const matched=new Map<string,string>();
  const assign=(root:string,seen:Set<string>):boolean=>{
   for(const publisher of edges.get(root)||[]){if(seen.has(publisher))continue;seen.add(publisher);const previous=matched.get(publisher);if(!previous||assign(previous,seen)){matched.set(publisher,root);return true}}
   return false;
  };
  for(const root of edges.keys())assign(root,new Set());
  return {valueHash,value:rows[0].value,origins:[...roots].sort(),publishers:[...publishers].sort(),independent:matched.size,observations:rows};
 }).sort((a,b)=>b.independent-a.independent||a.valueHash.localeCompare(b.valueHash));
 const leader=candidates[0],conflict=candidates.length>1;
 return {claim,status:leader&&leader.independent>=3&&leader.publishers.length>=3&&!conflict?'corroborated' as const:'unresolved' as const,conflict,candidates,rejected,policyVersion:'three-independent-origins-v1',permanentTruth:false};
}
