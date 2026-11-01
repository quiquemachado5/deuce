export type RecordQuery = Record<string, string | undefined>;

export function recordsUrl(query: RecordQuery, changes: RecordQuery = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...changes })) {
    if (key === 'tour' && value === 'atp') continue;
    if (value && value !== 'all' && !(['page', 'smallPage'].includes(key) && value === '1')) params.set(key, value);
  }
  return '/records' + (params.size ? `?${params}` : '');
}

export function recordsCanonical(query: RecordQuery) {
  return recordsUrl({}, {
    dato: query.dato,
    tour: query.tour === 'wta' ? 'wta' : undefined,
  });
}

export function recordsHaveTransientState(query: RecordQuery) {
  return Object.entries(query).some(([key, value]) =>
    Boolean(value && value !== 'all' && key !== 'dato' && key !== 'tour'));
}

export function recordFilters(query: RecordQuery): RecordQuery {
  return { era: query.era, year: query.year, surface: query.surface, competition: query.competition, tour: query.tour };
}
