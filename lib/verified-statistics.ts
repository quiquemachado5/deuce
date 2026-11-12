import registry from './verified-statistics.json';
import type { Tour } from './types';

export type StatisticSource = {
  url: string;
  publisher: string;
  origin: string;
  title: string;
  checkedAt: string;
  kind: 'official' | 'editorial' | 'encyclopedia';
  revision?: number;
};
export type StatisticObservation = { source: string; value: number; scope: string; unit: string; locator: string };
export type VerifiedStatistic = {
  id: string; tour: Tour; player: string; value: number; unit: string;
  label: string; period: string; scope: string; definition: string;
  status: 'reviewed' | 'pending'; reviewedAt: string;
  minimumSources?: 2 | 3;
  observations: StatisticObservation[];
};
export type StatisticRegistry = { schema: number; sources: Record<string, StatisticSource>; facts: VerifiedStatistic[] };

/** Independently reviewed pages, publishers and editorial origins. Existing facts
 * retain their three-source threshold; explicitly reviewed additions may use two. */
export function statisticVerification(fact: VerifiedStatistic, sources: StatisticRegistry['sources']) {
  const errors: string[] = [];
  if (fact.status !== 'reviewed') errors.push('pending-review');
  if (!Number.isFinite(fact.value) || fact.value < 0 || !fact.scope || !fact.unit || !fact.definition) errors.push('invalid-claim');
  const reviewed = Date.parse(fact.reviewedAt);
  if (!Number.isFinite(reviewed)) errors.push('missing-review-date');
  const pages = new Set<string>(), publishers = new Set<string>(), origins = new Set<string>();
  for (const observation of fact.observations) {
    const source = sources[observation.source];
    if (!source) { errors.push('unknown-source'); continue; }
    if (observation.value !== fact.value || observation.scope !== fact.scope || observation.unit !== fact.unit) errors.push('conflicting-observation');
    if (!observation.locator.trim() || !source.publisher.trim() || !source.origin.trim()) errors.push('missing-provenance');
    const checked = Date.parse(source.checkedAt);
    if (!Number.isFinite(checked) || checked > reviewed) errors.push('unreviewed-source');
    try {
      const url = new URL(source.url);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('invalid-source-url');
      if (source.kind === 'encyclopedia' && url.hostname.endsWith('.wikipedia.org') && url.searchParams.get('oldid') !== String(source.revision)) errors.push('mutable-encyclopedia-url');
      url.hash = '';
      // A translated page, tracking URL or alternate Wikipedia revision is not another page.
      const title = url.searchParams.get('title');
      const page = url.hostname.endsWith('.wikipedia.org') && title ? 'wikipedia:' + title : url.hostname.replace(/^www\./, '') + url.pathname;
      pages.add(page);
    } catch { errors.push('invalid-source-url'); }
    if (source.kind === 'encyclopedia' && (!Number.isSafeInteger(source.revision) || (source.revision || 0) <= 0)) errors.push('missing-encyclopedia-revision');
    publishers.add(source.publisher.trim().toLowerCase());
    origins.add(source.origin.trim().toLowerCase());
  }
  const minimum = fact.minimumSources ?? 3;
  if (minimum !== 2 && minimum !== 3) errors.push('invalid-source-threshold');
  if (pages.size < minimum || publishers.size < minimum || origins.size < minimum) errors.push('insufficient-independent-pages');
  return { accepted: errors.length === 0, errors: [...new Set(errors)], pages: pages.size, publishers: publishers.size };
}

export const statisticRegistry = registry as StatisticRegistry;
/** Local, reviewed reference figures only. No network request in a visitor's path. */
export function verifiedStatistics(tour: Tour) {
  return statisticRegistry.facts.filter(fact => fact.tour === tour && statisticVerification(fact, statisticRegistry.sources).accepted);
}
