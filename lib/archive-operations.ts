export function operationStatus(value: unknown) {
  const row = value && typeof value === 'object' ? value as Record<string,unknown> : {};
  const date = (v:unknown) => typeof v==='string'&&Number.isFinite(Date.parse(v))?v:undefined;
  return {
    status: typeof row.status==='string'?row.status:'unavailable',
    attemptAt: date(row.attemptAt)||date(row.at),
    successAt: date(row.lastSuccessAt)||(row.status==='success'?date(row.at):undefined),
    publicationAt: date(row.publicationAt),
    reason: typeof row.message==='string'?row.message:undefined,
    found: typeof row.matches==='number'?row.matches:typeof row.seasonMatches==='number'?row.seasonMatches:undefined,
    seasons: Array.isArray(row.seasonsRefreshed)?row.seasonsRefreshed.filter((v):v is number=>typeof v==='number'):[],
  };
}
export function wtaBackfillProgress(value: unknown) {
  if (!value || typeof value!=='object' || !Array.isArray((value as {complete?:unknown}).complete)) return undefined;
  const complete = new Set((value as {complete:unknown[]}).complete);
  const expected = Array.from({length:55},(_,i)=>1968+i).flatMap(year=>['G','M','A'].map(level=>`${year}-${level}`));
  return { total:expected.length, completed:expected.filter(id=>complete.has(id)).length, pending:expected.filter(id=>!complete.has(id)) };
}
