import {providerDailyCallCap,providerMinimumReserve,providerQuotaRetryAt,providerRemainingCalls} from './provider-quota';

type Quota=Record<string,unknown>&{today?:Record<string,unknown>};
export type ProviderAttemptLedger={schema:1;resetAt:string;attempts:number;usedEstimate:number;remaining:number|null;verified:boolean;lastAttemptAt?:string};
export class ProviderAttemptBudgetExceeded extends Error {
  constructor(readonly reason:'daily-cap'|'reserve'|'unverified',readonly retryAt:string){super('Provider request blocked by '+reason);this.name='ProviderAttemptBudgetExceeded';}
}
const quotaUsed=(quota:Quota)=>{
  for(const field of ['used_day','daily_used','used']){const raw=quota.today?.[field]??quota[field];if(raw===undefined||raw===null||raw==='')continue;const value=Number(raw);if(Number.isSafeInteger(value)&&value>=0)return value;}
  return undefined;
};
function currentLedger(saved:unknown,now:number):ProviderAttemptLedger{
  if(saved===undefined)return {schema:1,resetAt:providerQuotaRetryAt(undefined,now),attempts:0,usedEstimate:0,remaining:null,verified:false};
  if(!saved||typeof saved!=='object')throw new Error('Invalid provider attempt ledger');
  const row=saved as ProviderAttemptLedger;
  if(row.schema!==1||!Number.isFinite(Date.parse(row.resetAt))||!Number.isSafeInteger(row.attempts)||row.attempts<0||!Number.isSafeInteger(row.usedEstimate)||row.usedEstimate<row.attempts||typeof row.verified!=='boolean'||row.remaining!==null&&(!Number.isSafeInteger(row.remaining)||row.remaining<0))throw new Error('Invalid provider attempt ledger');
  return Date.parse(row.resetAt)<=now?currentLedger(undefined,now):{...row};
}
/** Pure reservation policy. Persist the returned state BEFORE performing any network attempt. */
export function reserveProviderAttempt(saved:unknown,usageProbe:boolean,now=Date.now(),cap=providerDailyCallCap(),reserve=providerMinimumReserve()):ProviderAttemptLedger{
 const ledger=currentLedger(saved,now);
 if(ledger.usedEstimate>=cap)throw new ProviderAttemptBudgetExceeded('daily-cap',ledger.resetAt);
 if(ledger.remaining!==null&&ledger.remaining<=reserve)throw new ProviderAttemptBudgetExceeded('reserve',ledger.resetAt);
 if(!usageProbe&&!ledger.verified)throw new ProviderAttemptBudgetExceeded('unverified',ledger.resetAt);
 return {...ledger,attempts:ledger.attempts+1,usedEstimate:ledger.usedEstimate+1,remaining:ledger.remaining===null?null:Math.max(0,ledger.remaining-1),lastAttemptAt:new Date(now).toISOString()};
}
/** A usage response reconciles other consumers without refunding failed/retried attempts. */
export function reconcileProviderAttempts(saved:unknown,quota:Quota,now=Date.now()):ProviderAttemptLedger{
 const ledger=currentLedger(saved,now),remaining=providerRemainingCalls(quota),used=quotaUsed(quota);
 const rawRemaining=quota.today?.remaining_day;
 const verified=rawRemaining===null||rawRemaining!==undefined&&rawRemaining!==''&&Number.isSafeInteger(Number(rawRemaining))&&Number(rawRemaining)>=0;
 return {...ledger,resetAt:providerQuotaRetryAt(quota,now),usedEstimate:Math.max(ledger.usedEstimate,used??0),remaining:remaining===Infinity?null:remaining,verified};
}
