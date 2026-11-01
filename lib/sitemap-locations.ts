import type { Match } from './types';

export const SITEMAP_ORIGIN = 'https://deuce-archive.vercel.app';

/** Public, indexable routes that do not depend on the generated archive. */
export const SITEMAP_STATIC_PATHS = [
  '',
  '/records',
  '/jugadores',
  '/buscar',
  '/torneos',
  '/info',
  '/licencias',
  '/cobertura',
  '/historias',
] as const;

/**
 * Next 16.4 serializes MetadataRoute.Sitemap URLs without escaping XML text.
 * Escape here so a query string remains a valid <loc> and XML readers decode it
 * back to the intended URL.
 */
export function sitemapLocation(path: string) {
  return `${SITEMAP_ORIGIN}${path}`.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character]!);
}

export function matchSitemapEntries(matches: Match[], year: number, lastModified: string) {
  return matches.filter(match => match.year === year).map(match => ({
    url: `${SITEMAP_ORIGIN}/match/${match.match_id}`,
    lastModified,
    changeFrequency: 'never' as const,
    priority: 0.5,
  }));
}
