import type { Match } from './types';
import { SITE_ORIGIN } from './site-origin';
import { exactDay } from './archive-freshness';

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
  '/buscar',
  '/torneos',
  '/info',
  '/licencias',
  '/cobertura',
  '/historias',
  '/sobre',
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

export function matchSitemapEntries(matches: Match[], year: number) {
  return matches.filter(match => match.year === year).map(match => {
    const playedOn = match.context?.dateLabel === 'Fecha del partido'
      ? exactDay(match.context.date)
      : null;
    return {
      url: `${SITEMAP_ORIGIN}/match/${match.match_id}`,
      ...(playedOn ? { lastModified: `${playedOn}T12:00:00.000Z` } : {}),
      changeFrequency: 'never' as const,
      priority: 0.5,
    };
  });
}
