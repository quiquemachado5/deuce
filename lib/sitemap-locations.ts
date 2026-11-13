import type { Match } from './types';
import { SITE_ORIGIN } from './site-origin';

export const SITEMAP_ORIGIN = SITE_ORIGIN;

export function sitemapIndexLocations(currentYear = new Date().getUTCFullYear()) {
  const lastYear = Math.max(1968, currentYear);
  return [
    `${SITEMAP_ORIGIN}/sitemap.xml`,
    ...Array.from({ length: lastYear - 1967 }, (_, index) => `${SITEMAP_ORIGIN}/match/sitemap/${1968 + index}.xml`),
  ];
}

/** Public, indexable routes that do not depend on the generated archive. */
export const SITEMAP_STATIC_PATHS = [
  '',
  '/records',
  '/jugadores',
  '/partidos',
  '/torneos',
  '/licencias',
  '/cobertura',
  '/cobertura/correcciones',
  '/sobre',
  '/desarrolladores',
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

export function matchSitemapEntries(matches: Match[], year: number, modified:Record<string,string>={}) {
  return matches.filter(match => match.year === year).map(match => ({
    url: `${SITEMAP_ORIGIN}/match/${match.match_id}`,
    ...(modified[`/match/${match.match_id}`]?{lastModified:modified[`/match/${match.match_id}`]}:{}),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));
}
