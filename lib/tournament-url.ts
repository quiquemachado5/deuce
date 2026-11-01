import type { Match, Tour } from './types';

type EditionMatch = Pick<Match, 'year' | 'tour' | 'category'>;

export function tournamentDirectoryUrl(tour: Tour, category?: string, page = 1) {
  const params = new URLSearchParams();
  if (tour === 'wta') params.set('circuito', 'wta');
  if (category) params.set('categoria', category);
  if (page > 1) params.set('page', String(page));
  return `/torneos${params.size ? `?${params}` : ''}`;
}

export function tournamentEditionCanonicalPath({
  slug,
  year,
  matches,
  tour,
  category,
}: {
  slug: string;
  year: number;
  matches: EditionMatch[];
  tour: Tour;
  category?: string;
}) {
  const options = matches.filter(match => match.year === year);
  const selected = options.filter(match => (match.tour || 'atp') === tour);
  const selectedCategory = category && selected.some(match => match.category === category)
    ? category
    : selected[0]?.category;
  const params = new URLSearchParams();
  if (selectedCategory && new Set(options.map(match => match.category)).size > 1) {
    params.set('categoria', selectedCategory);
  }
  if (tour === 'wta' && selected.length) params.set('cuadro', 'wta');
  return `/torneos/${slug}/${year}${params.size ? `?${params}` : ''}`;
}

export function tournamentEditionCanonicalPaths(slug: string, matches: EditionMatch[]) {
  const variants = new Map<string, EditionMatch>();
  for (const match of matches) {
    const tour = match.tour === 'wta' ? 'wta' : 'atp';
    const key = `${match.year}:${tour}:${match.category}`;
    if (!variants.has(key)) variants.set(key, match);
  }
  return [...variants.values()].map(match => tournamentEditionCanonicalPath({
    slug,
    year: match.year,
    matches,
    tour: match.tour === 'wta' ? 'wta' : 'atp',
    category: match.category,
  }));
}
