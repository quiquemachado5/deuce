import {detailCandidateKey,enrichmentPlan,type DetailCandidate} from './enrichment-plan';

export const ENRICHMENT_QUEUE_SCHEMA=1;
export type EnrichmentDeferReason='unavailable'|'rejected';
export type EnrichmentQueueState={
  schema:typeof ENRICHMENT_QUEUE_SCHEMA;
  updatedAt:string;
  deferred:Record<string,{reason:EnrichmentDeferReason;attempts:number;lastAttemptAt:string;retryAt:string}>;
};

export function readEnrichmentQueue(value:unknown):EnrichmentQueueState{
  const row=value&&typeof value==='object'?value as Partial<EnrichmentQueueState>:{};
  const deferred:EnrichmentQueueState['deferred']={};
  if(row.deferred&&typeof row.deferred==='object')for(const [key,item] of Object.entries(row.deferred)){
    if(!item||typeof item!=='object')continue;
    const candidate=item as EnrichmentQueueState['deferred'][string];
    if((candidate.reason==='unavailable'||candidate.reason==='rejected')&&Number.isSafeInteger(candidate.attempts)
      &&candidate.attempts>0&&Number.isFinite(Date.parse(candidate.lastAttemptAt))&&Number.isFinite(Date.parse(candidate.retryAt)))deferred[key]=candidate;
  }
  return {schema:ENRICHMENT_QUEUE_SCHEMA,updatedAt:typeof row.updatedAt==='string'?row.updatedAt:new Date(0).toISOString(),deferred};
}

export function deferredEnrichmentKeys(state:EnrichmentQueueState,known:ReadonlySet<string>,now=Date.now()){
  const keys=new Set<string>(known);
  for(const [key,row] of Object.entries(state.deferred))if(Date.parse(row.retryAt)>now)keys.add(key);
  return keys;
}

export function persistentEnrichmentPlan(candidates:DetailCandidate[],known:ReadonlySet<string>,state:EnrichmentQueueState,limit=90,now=Date.now()){
  return enrichmentPlan(candidates,deferredEnrichmentKeys(state,known,now),limit);
}

export function deferEnrichment(state:EnrichmentQueueState,candidate:DetailCandidate,reason:EnrichmentDeferReason,now=Date.now()){
  const key=detailCandidateKey(candidate),previous=state.deferred[key],attempts=(previous?.attempts||0)+1;
  // A missing provider detail is usually permanent. Identity mismatches are
  // retried sooner because providers can correct crossed responses.
  const baseDays=reason==='unavailable'?30:14;
  const delayDays=Math.min(180,baseDays*Math.max(1,2**Math.min(3,attempts-1)));
  const next:EnrichmentQueueState={...state,updatedAt:new Date(now).toISOString(),deferred:{...state.deferred}};
  next.deferred[key]={reason,attempts,lastAttemptAt:new Date(now).toISOString(),retryAt:new Date(now+delayDays*86_400_000).toISOString()};
  return next;
}

export function completeEnrichment(state:EnrichmentQueueState,candidate:DetailCandidate,now=Date.now()){
  const key=detailCandidateKey(candidate);
  if(!state.deferred[key])return state;
  const deferred={...state.deferred};delete deferred[key];
  return {...state,updatedAt:new Date(now).toISOString(),deferred};
}

export function enrichmentQueueCounts(candidates:DetailCandidate[],known:ReadonlySet<string>,state:EnrichmentQueueState,now=Date.now()){
  const unique=new Set(candidates.map(detailCandidateKey)),blocked=deferredEnrichmentKeys(state,new Set(),now);
  let remaining=0,deferred=0;
  for(const key of unique){if(known.has(key))continue;if(blocked.has(key))deferred++;else remaining++;}
  return {candidates:unique.size,known:[...unique].filter(key=>known.has(key)).length,remaining,deferred};
}
