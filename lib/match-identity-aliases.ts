/** Reviewed Miami draw entries and later provider observations describe the same contests. */
export const MATCH_ID_ALIASES:Readonly<Record<string,string>>={
 'reference-miami-2026-ms010':'live-218144',
 'reference-miami-2026-ms014':'live-218145',
 'reference-miami-2026-ms004':'live-218146',
 'reference-miami-2026-ms006':'live-218147',
 'reference-miami-2026-ms002':'live-218148',
 'reference-miami-2026-ms003':'live-218149',
};
export const canonicalMatchId=(id:string)=>MATCH_ID_ALIASES[id]||id;
export const isReviewedMatchAlias=(id:string)=>id in MATCH_ID_ALIASES||Object.values(MATCH_ID_ALIASES).includes(id);
