/** The provider explicitly distinguishes observed points from reconstructed tape. */
export function isReconstructedDetail(detail: unknown): boolean {
  if (!detail || typeof detail !== 'object') return false;
  const row = detail as {meta?:{coverage?:unknown;point_source?:unknown};match?:{score?:{origin?:unknown}};tape?:Array<{origin?:unknown}>};
  return [row.meta?.coverage,row.meta?.point_source,row.match?.score?.origin].some(value=>/reconstruct|mixed/i.test(String(value||'')))
    || Array.isArray(row.tape)&&row.tape.some(point=>/reconstruct/i.test(String(point.origin||'')));
}

/** Retain the original source labels through normalization, without copying tape payloads. */
export function reconstructedEvidence(detail: unknown): unknown {
  if(!isReconstructedDetail(detail))return undefined;
  const row=detail as {meta?:{coverage?:unknown;point_source?:unknown};match?:{score?:{origin?:unknown}};tape?:Array<{origin?:unknown}>};
  return {meta:{coverage:row.meta?.coverage,point_source:row.meta?.point_source},match:{score:{origin:row.match?.score?.origin}},tape:[...new Set((row.tape||[]).map(point=>point.origin).filter(origin=>typeof origin==='string'))].map(origin=>({origin}))};
}
