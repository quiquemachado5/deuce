type Row = { id: unknown; [key: string]: unknown };
export type SeasonCheckpoint = { season: number; tour: 'atp' | 'wta'; baselineAt?: string; startedAt: string; windows: string[]; windowIndex: number; offset: number; rows: Row[] };
export type Season = { scope?: string; at?: string; data?: Row[] } | null | undefined;

/** A saved incremental season overlays the complete bundled baseline by ID. */
export function mergeSeasonBaseline(bundled:Season,saved:Season,tour:'atp'|'wta'='atp'):Season {
  if(!bundled)return saved;
  const rows=new Map<string,Row>();
  for(const row of [...(bundled.data||[]),...(saved?.data||[])]){
    if(row.tour&&row.tour!==tour)throw Error('Season baseline contains another circuit');
    rows.set(String(row.id),{...row,tour});
  }
  const dates=[bundled.at,saved?.at].filter((value):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value)));
  const at=dates.sort((a,b)=>Date.parse(b)-Date.parse(a))[0];
  return {data:[...rows.values()],scope:`${tour}-main-v2`,...(at?{at}:{})};
}
/** Fully page every query. A short filtered page is not an end-of-data signal. */
export async function reconcileSeasonResults(
  season: number,
  currentYear: number,
  previous: Season,
  request: (
    path: string,
  ) => Promise<{ data?: Row[]; meta?: { has_more?: boolean; limit?: number } }>,
  tour: 'atp' | 'wta' = 'atp',
  progress?: { resume?: SeasonCheckpoint; save: (checkpoint: SeasonCheckpoint) => Promise<void> },
) {
  const last = Date.parse(previous?.at || ""),
    migrated = previous?.scope === `${tour}-main-v2` && Number.isFinite(last);
  const full = `from=${season}-01-01&to=${season}-12-31`;
  const since = migrated
    ? `&restated_since=${encodeURIComponent(new Date(last - 86400000).toISOString())}`
    : "";
  const plannedWindows = !migrated
    ? [full]
    : season < currentYear
      ? [full + since]
      : [
          `from=${new Date(Math.max(Date.UTC(season, 0, 1), last - 7 * 86400000)).toISOString().slice(0, 10)}&to=${season}-12-31`,
          full + since,
        ];
  const saved = progress?.resume;
  const resume = saved?.season === season && saved.tour === tour
    && saved.baselineAt === previous?.at && Array.isArray(saved.rows)
    && Array.isArray(saved.windows) && Number.isSafeInteger(saved.windowIndex)
    && saved.windowIndex >= 0 && saved.windowIndex <= saved.windows.length
    && Number.isSafeInteger(saved.offset) && saved.offset >= 0
    && Number.isFinite(Date.parse(saved.startedAt)) ? saved : undefined;
  const windows = resume?.windows || plannedWindows;
  const startedAt = resume?.startedAt || new Date().toISOString();
  const fresh: Row[] = resume ? [...resume.rows] : [];
  if ([...(previous?.data || []), ...fresh].some(row => row.tour && row.tour !== tour))
    throw Error('Provider returned another circuit');
  for (let windowIndex = resume?.windowIndex || 0; windowIndex < windows.length; windowIndex++) {
    let offset = windowIndex === resume?.windowIndex ? resume.offset : 0;
    for (;;) {
      const page = await request(
        `/history/matches?tour=${tour}&draw=singles&${windows[windowIndex]}&limit=200&offset=${offset}`,
      );
      if (!Array.isArray(page.data) || !page.meta || typeof page.meta.has_more !== 'boolean')
        throw Error('Unexpected tennis list response');
      if (page.data.some(row => row.tour && row.tour !== tour)) throw Error('Provider returned another circuit');
      const step = Number(page.meta.limit);
      if (page.meta.has_more && (!Number.isSafeInteger(step) || step <= 0))
        throw Error('Invalid pagination from provider');
      fresh.push(...page.data.map(row => ({ ...row, tour })));
      const nextOffset = page.meta.has_more ? offset + step : 0;
      await progress?.save({ season, tour, baselineAt: previous?.at, startedAt, windows,
        windowIndex: page.meta.has_more ? windowIndex : windowIndex + 1, offset: nextOffset, rows: [...fresh] });
      if (!page.meta.has_more) break;
      offset = nextOffset;
    }
  }
  const merged = new Map<string, Row>(
    (previous?.data || []).map((row) => [String(row.id), row]),
  );
  for (const row of fresh) merged.set(String(row.id), row);
  return {
    data: [...merged.values()],
    fresh,
    scope: `${tour}-main-v2` as const,
    at: startedAt,
  };
}
