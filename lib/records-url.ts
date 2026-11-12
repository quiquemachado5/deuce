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

/** Only career wins currently has an equivalent English statistics page. */
export function recordLanguageAlternates(query:RecordQuery){
  if(query.dato!=='victorias'||recordsHaveTransientState(query))return undefined;
  const suffix=query.tour==='wta'?'?tour=wta':'';
  return {es:recordsCanonical(query),en:'/en/records'+suffix};
}

export function recordsHaveTransientState(query: RecordQuery) {
  return Object.entries(query).some(([key, value]) =>
    Boolean(value && value !== 'all' && key !== 'dato' && key !== 'tour'));
}

export function recordFilters(query: RecordQuery): RecordQuery {
  return { era: query.era, year: query.year, surface: query.surface, competition: query.competition, tour: query.tour };
}

export function recordEraPlayerUrl(slug: string, filters: RecordQuery = {}) {
  return `/jugadores/${slug}${filters.tour === 'wta' ? '?tour=wta' : ''}`;
}

export function recordEraEvidenceUrl(name: string, cut: number, filters: RecordQuery = {}) {
  const params = new URLSearchParams();
  for (const key of ['year', 'surface', 'competition', 'era', 'tour']) {
    const value = filters[key];
    if (value && value !== 'all') params.set(key, value);
  }
  params.set('dato', 'dos-epocas');
  params.set('nombre', name);
  params.set('corte', String(cut));
  return `/records/evidencia?${params}`;
}
