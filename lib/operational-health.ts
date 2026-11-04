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
