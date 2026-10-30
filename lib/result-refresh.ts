type Row = { id: unknown; [key: string]: unknown };
type Season = { scope?: string; at?: string; data?: Row[] } | null;
/** Fully page every query. A short filtered page is not an end-of-data signal. */
export async function reconcileSeasonResults(
  season: number,
  currentYear: number,
  previous: Season,
  request: (
    path: string,
  ) => Promise<{ data?: Row[]; meta?: { has_more?: boolean; limit?: number } }>,
  tour: 'atp' | 'wta' = 'atp',
) {
  const last = Date.parse(previous?.at || ""),
    migrated = previous?.scope === `${tour}-main-v2` && Number.isFinite(last);
  const full = `from=${season}-01-01&to=${season}-12-31`;
  const since = migrated
    ? `&restated_since=${encodeURIComponent(new Date(last - 86400000).toISOString())}`
    : "";
  const windows = !migrated
    ? [full]
    : season < currentYear
      ? [full + since]
      : [
          `from=${new Date(Math.max(Date.UTC(season, 0, 1), last - 7 * 86400000)).toISOString().slice(0, 10)}&to=${season}-12-31`,
          full + since,
        ];
  const fresh: Row[] = [];
  for (const range of windows)
    for (let offset = 0; ;) {
      const page = await request(
        `/history/matches?tour=${tour}&draw=singles&${range}&limit=200&offset=${offset}`,
      );
      if (!Array.isArray(page.data) || !page.meta)
        throw Error("Unexpected tennis list response");
      fresh.push(...page.data);
      if (!page.meta.has_more) break;
      const step = Number(page.meta.limit);
      if (!Number.isSafeInteger(step) || step <= 0)
        throw Error("Invalid pagination from provider");
      offset += step;
    }
  const merged = new Map<string, Row>(
    (previous?.data || []).map((row) => [String(row.id), row]),
  );
  for (const row of fresh) merged.set(String(row.id), row);
  return {
    data: [...merged.values()],
    fresh,
    scope: `${tour}-main-v2` as const,
    at: new Date().toISOString(),
  };
}
