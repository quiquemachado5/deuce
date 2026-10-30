export type RecordQuery = Record<string, string | undefined>;

export function recordsUrl(query: RecordQuery, changes: RecordQuery = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...changes })) {
    if (value && value !== 'all' && !(['page', 'smallPage'].includes(key) && value === '1')) params.set(key, value);
  }
  return '/records' + (params.size ? `?${params}` : '');
}

export function recordFilters(query: RecordQuery): RecordQuery {
  return { era: query.era, year: query.year, surface: query.surface, competition: query.competition, tour: query.tour };
}
