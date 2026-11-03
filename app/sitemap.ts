import type { MetadataRoute } from 'next';
import { preparedCompactSelection, preparedPlayerRecords } from '@/lib/revista/read-records';
import { playerSlug } from '@/lib/explore';
import { recordsCanonical } from '@/lib/records-url';
import { tournamentDirectory } from '@/lib/tournament-directory';
import { tournamentEditionCanonicalPaths } from '@/lib/tournament-url';
import { SITEMAP_STATIC_PATHS, sitemapLocation } from '@/lib/sitemap-locations';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [generation,matches]=await Promise.all([preparedPlayerRecords(),preparedCompactSelection({tour:'all',rounds:['Final']})]);
  const players=generation.records;
  const events = tournamentDirectory(matches);
  const hasWomen = matches.some(match => match.tour === 'wta');
  const editions = new Set(events.flatMap(event => tournamentEditionCanonicalPaths(event.slug, event.matches)));
  const eventPages = events.flatMap(event => [
    ...(event.matches.some(match=>match.tour!=='wta')?[`/torneos/${event.slug}`]:[]),
    ...(event.matches.some(match => match.tour === 'wta') ? [`/torneos/${event.slug}?cuadro=wta`] : []),
  ]);
  const recordPages = generation.manifest.pieces.flatMap(piece => [
    recordsCanonical({dato:piece.id,tour:'atp'}),
    ...(hasWomen&&generation.manifest.circuitPieces?.wta.some(p=>p.id===piece.id)?[recordsCanonical({dato:piece.id,tour:'wta'})]:[]),
  ]);
  const paths = [
    ...SITEMAP_STATIC_PATHS,
    ...(hasWomen ? ['/torneos?circuito=wta', '/jugadores?tour=wta', '/buscar?tour=wta', '/records?tour=wta'] : []),
    ...recordPages, ...eventPages,
    ...players.map(player => `/jugadores/${playerSlug(player.name)}${player.tour === 'wta' ? '?tour=wta' : ''}`),
    ...editions,
  ];
  return [...new Set(paths)].map(path => ({
    url: sitemapLocation(path),
    lastModified: generation.manifest.generatedAt,
    changeFrequency: (path===''?'daily':path.startsWith('/match/')?'never':'weekly') as 'daily'|'never'|'weekly',
    priority: path===''?1:path==='/buscar'||path==='/records'?0.9:0.7,
  }));
}
