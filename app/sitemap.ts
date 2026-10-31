import type { MetadataRoute } from 'next';
import { preparedGeneration } from '@/lib/revista/read-records';
import { playerSlug } from '@/lib/explore';
import { tournamentDirectory } from '@/lib/tournament-directory';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const generation = await preparedGeneration();
  const [matches, players] = await Promise.all([generation.matches(), generation.records()]);
  const events = tournamentDirectory(matches);
  const hasWomen = matches.some(match => match.tour === 'wta');
  const editions = new Set(events.flatMap(event => event.matches.map(match =>
    `/torneos/${event.slug}/${match.year}${match.tour === 'wta' ? '?cuadro=wta' : ''}`,
  )));
  const eventPages = events.flatMap(event => [
    `/torneos/${event.slug}`,
    ...(event.matches.some(match => match.tour === 'wta') ? [`/torneos/${event.slug}?cuadro=wta`] : []),
  ]);
  const recordPages = generation.manifest.pieces.flatMap(piece => [
    `/records?dato=${piece.id}&tour=atp`,
    ...(hasWomen ? [`/records?dato=${piece.id}&tour=wta`] : []),
  ]);
  const paths = [
    '', '/records', '/jugadores', '/buscar', '/torneos', '/comparar', '/info',
    '/licencias', '/cobertura', '/historias',
    ...(hasWomen ? ['/torneos?circuito=wta', '/jugadores?tour=wta', '/buscar?tour=wta', '/records?tour=wta'] : []),
    ...recordPages, ...eventPages,
    ...players.map(player => `/jugadores/${playerSlug(player.name)}${player.tour === 'wta' ? '?tour=wta' : ''}`),
    ...editions,
  ];
  return [...new Set(paths)].map(path => ({
    url: `https://deuce-archive.vercel.app${path}`,
    lastModified: generation.manifest.generatedAt,
    changeFrequency: (path===''?'daily':path.startsWith('/match/')?'never':'weekly') as 'daily'|'never'|'weekly',
    priority: path===''?1:path==='/buscar'||path==='/records'?0.9:0.7,
  }));
}
