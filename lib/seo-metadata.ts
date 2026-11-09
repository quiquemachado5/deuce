import type { Tour } from './types';
import type { Match } from './types';
import { SITE_ORIGIN } from './site-origin';
import { playerSlug } from './explore';
import { tournamentName } from './labels';
import { score } from './cuaderno/model';

type TourSummary = {
  tours?: Partial<Record<Tour, number>>;
};

export const noIndexFollow = { index: false, follow: true } as const;

export function hasPublishedTour(summary: TourSummary, tour: Tour) {
  return (summary.tours?.[tour] || 0) > 0;
}

export function robotsForUnavailableTour(summary: TourSummary, tour: Tour) {
  return tour === 'wta' && !hasPublishedTour(summary, tour) ? noIndexFollow : undefined;
}

export function matchCanonicalPath(id: string) {
  return `/match/${id}`;
}

export function matchHasTransientState(query: { junto?: string; vista?: string }) {
  return Boolean(query.junto || query.vista);
}

export type BreadcrumbItem = { name: string; path: string };

export function absoluteSiteUrl(path: string) {
  return new URL(path, `${SITE_ORIGIN}/`).toString();
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteSiteUrl(item.path),
    })),
  };
}

export function itemListJsonLd(name: string, items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteSiteUrl(item.path),
    })),
  };
}

function publishedMatchDates(match: Match) {
  if (match.context?.dateLabel !== 'Fecha del partido') return {};
  const startDate = typeof match.context.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(match.context.date)
    ? match.context.date
    : undefined;
  const endDate = startDate && typeof match.context.endDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(match.context.endDate)
    ? match.context.endDate
    : undefined;
  return { ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) };
}

function playerUrl(name: string, tour: Tour, language: 'es' | 'en' = 'es') {
  const query = tour === 'wta' ? '?tour=wta' : '';
  const root = language === 'en' ? '/en/players' : '/jugadores';
  return absoluteSiteUrl(`${root}/${playerSlug(name)}${query}`);
}

export function matchJsonLd(match: Match, options: { language?: 'es' | 'en' } = {}) {
  const tour = match.tour || 'atp';
  const language = options.language || 'es';
  const canonical = language === 'en' ? `/en/matches/${match.match_id}` : matchCanonicalPath(match.match_id);
  const eventName = language === 'en' ? match.tournament : tournamentName(match.tournament);
  const description = language === 'en'
    ? `${eventName} ${match.year}. ${score(match)}. Documented ${tour.toUpperCase()} result in DEUCE.`
    : `${eventName} ${match.year}. ${score(match)}. Resultado ${tour.toUpperCase()} documentado en DEUCE.`;
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${match.player1.name} – ${match.player2.name} · ${eventName} ${match.year}`,
    description,
    url: absoluteSiteUrl(canonical),
    image: absoluteSiteUrl(`${matchCanonicalPath(match.match_id)}/opengraph-image`),
    sport: 'Tennis',
    eventStatus: 'https://schema.org/EventCompleted',
    ...publishedMatchDates(match),
    superEvent: {
      '@type': 'EventSeries',
      name: `${eventName} ${match.year}`,
    },
    competitor: [match.player1, match.player2].map((player) => ({
      '@type': 'Person',
      name: player.name,
      url: playerUrl(player.name, tour, language),
    })),
    organizer: { '@type': 'SportsOrganization', name: tour.toUpperCase() },
  };
}

export function playerProfileJsonLd(input: {
  name: string;
  slug: string;
  tour: Tour;
  description: string;
  image?: string;
  countryCode?: string;
}) {
  const query = input.tour === 'wta' ? '?tour=wta' : '';
  const url = absoluteSiteUrl(`/jugadores/${input.slug}${query}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `${input.name} — DEUCE`,
    description: input.description,
    url,
    mainEntity: {
      '@type': 'Person',
      name: input.name,
      url,
      ...(input.image ? { image: absoluteSiteUrl(input.image) } : {}),
      ...(input.countryCode ? { nationality: { '@type': 'Country', identifier: input.countryCode } } : {}),
      knowsAbout: 'Tennis',
    },
  };
}

export function tournamentSeriesJsonLd(input: {
  name: string;
  slug: string;
  category: string;
  tour: Tour;
  years: number[];
  description: string;
}) {
  const query = input.tour === 'wta' ? '?cuadro=wta' : '';
  const url = absoluteSiteUrl(`/torneos/${input.slug}${query}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'EventSeries',
    name: input.name,
    description: input.description,
    url,
    sport: 'Tennis',
    keywords: [input.category, input.tour.toUpperCase()],
    organizer: { '@type': 'SportsOrganization', name: input.tour.toUpperCase() },
    subEvent: input.years.slice(0, 12).map((year) => ({
      '@type': 'SportsEvent',
      name: `${input.name} ${year}`,
      url: absoluteSiteUrl(`/torneos/${input.slug}/${year}${query}`),
      sport: 'Tennis',
    })),
  };
}
