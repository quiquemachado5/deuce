export type MatchQuery = Record<string, string | undefined>;

export function matchSearchUrl(query: MatchQuery, changes: MatchQuery = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...changes })) {
    if (value && (value !== 'all' || key === 'year') && !['page', 'editions', 'player'].includes(key)) params.set(key, value);
  }
  return `/buscar${params.size ? `?${params}` : ''}`;
}
