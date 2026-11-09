export type MatchQuery = Record<string, string | undefined>;

export function matchSearchUrl(query: MatchQuery, changes: MatchQuery = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...changes })) {
    if (value && !(key === 'tour' && value === 'atp') && (value !== 'all' || key === 'year' || key === 'tour') && !['page', 'editions', 'player'].includes(key)) params.set(key, value);
  }
  return `/partidos${params.size ? `?${params}` : ''}`;
}
