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
