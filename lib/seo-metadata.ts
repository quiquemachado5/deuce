import type { Tour } from './types';

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
