type UpdateStatus = {
  status?: unknown;
  ageHours?: unknown;
  lastSuccessAgeHours?: unknown;
};

const protectedDeferral = new Set(['quota-reserve', 'free-history-limit']);

/** A protected quota deferral is healthy while the last successful data is fresh. */
export function dailyUpdateFresh(value: UpdateStatus, staleAfterHours = 36) {
  const status=typeof value.status==='string'?value.status:'';
  const age=status==='success'?Number(value.ageHours)
    :protectedDeferral.has(status)?Number(value.lastSuccessAgeHours):Number.NaN;
  return Number.isFinite(age)&&age<=staleAfterHours;
}

export function dailyUpdateIssue(values:UpdateStatus[],staleAfterHours=36) {
  return values.some(value=>!dailyUpdateFresh(value,staleAfterHours));
}

/** A quota pause may reuse a recent completed refresh, never a failed or partial attempt. */
export function publicationRefreshReady(value:{status?:unknown;at?:unknown;lastSuccessAt?:unknown}|null|undefined,now=Date.now(),staleAfterHours=36){
  if(!value)return false;
  const timestamp=value.status==='success'?value.at:value.lastSuccessAt;
  const at=typeof timestamp==='string'?Date.parse(timestamp):Number.NaN;
  if(!Number.isFinite(at)||at>now)return false;
  const ageHours=(now-at)/3_600_000;
  return dailyUpdateFresh({status:value.status,ageHours,lastSuccessAgeHours:ageHours},staleAfterHours);
}

/** Keep the provider extent from the completed attempt, not the later quota probe. */
export function publicationRefreshCheckpoint(value:Record<string,unknown>|null|undefined,now=Date.now()):Record<string,unknown>|undefined{
  if(!publicationRefreshReady(value,now))return undefined;
  if(value!.status==='success')return value!;
  const successAt=Date.parse(String(value!.lastSuccessAt));
  const history=Array.isArray(value!.history)?value!.history:[];
  return history.filter((row):row is Record<string,unknown>=>!!row&&typeof row==='object'&&row.status==='success'
    &&publicationRefreshReady(row,now)&&Date.parse(String(row.at))<=successAt)
    .sort((a,b)=>Date.parse(String(b.at))-Date.parse(String(a.at)))[0];
}

/** Accept the old drill schema only when it carries every success artifact. */
export function restoreValidationEvidence(value:unknown) {
  const row=value&&typeof value==='object'?value as Record<string,unknown>:{};
  if(row.restoreValidated===true)return true;
  return row.status==='success'
    &&typeof row.archive==='string'&&/^deuce-archive-\d{8}T\d{6}Z\.tar\.gz$/.test(row.archive)
    &&typeof row.sha256==='string'&&/^[a-f0-9]{64}$/.test(row.sha256)
    &&typeof row.image==='string'&&row.image.length>0
    &&typeof row.backupAt==='string'&&Number.isFinite(Date.parse(row.backupAt));
}
