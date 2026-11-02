import type { Tour } from './types';

const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const lowLevelVenue = (value: string) => /(?:^|\s)w?\d{2,3}(?:\s|$)|\$\d+k\b/i.test(value);

type ProviderTournamentContext = { tour?: Tour; tier?: unknown; level?: unknown };

/** Preserve lower-circuit venue identities while joining known tour-level aliases. */
export function providerTournamentName(name: string, context: ProviderTournamentContext = {}) {
  const cleaned = name.trim().replace(/^(?:ATP|WTA)\s+/i, '');
  const normalized = fold(cleaned);
  if (lowLevelVenue(cleaned)) return cleaned;
  if (normalized.includes('australian open') || normalized.includes('australian chps')) return 'Australian Open';
  if (normalized.includes('roland') || normalized.includes('french open')) return 'Roland Garros';
  if (normalized.includes('wimbledon')) return 'Wimbledon';
  if (normalized.includes('us open')) return 'US Open';
  if (normalized.includes('indian wells')) return 'Indian Wells';
  if (normalized.includes('miami')) return 'Miami';
  if (normalized.includes('monte')) return 'Monte Carlo';
  if (normalized.includes('canad') || normalized.includes('toronto') || normalized.includes('montreal')) return 'Canada';
  if (normalized.includes('cincinnati')) return 'Cincinnati';
  if (normalized.includes('shanghai')) return 'Shanghai';
  if (normalized.includes('paris')) return 'Paris';
  if (/^madrid(?:\b| \(spain\))/.test(normalized)) return 'Madrid';
  if (/^(?:rome|roma)(?:\b| \(italy\))/.test(normalized)) return 'Rome';
  if (context.tour === 'wta' && /^(?:berlin)(?:\b|, germany)/.test(normalized)) return 'Berlin';
  if (context.tour === 'wta' && /^(?:stuttgart)(?:\b|, germany)/.test(normalized)) return 'Stuttgart';
  return cleaned;
}

const venueAliases: Record<string, string> = {
  'bad homburg, germany': 'Bad Homburg',
  'bad homburg open': 'Bad Homburg',
  'bad homburg, germany, doubles': 'Bad Homburg',
  'berlin, germany': 'Berlin',
  'berlin, germany, qualifying': 'Berlin',
  'madrid (spain)': 'Madrid',
  'madrid (spain), clay': 'Madrid',
  'rome (italy)': 'Rome',
  roma: 'Rome',
  'stuttgart, germany': 'Stuttgart',
};

const atpVenueAliases: Record<string, string> = {
  'eastbourne, great britain': 'Eastbourne',
  'geneva, switzerland': 'Geneva',
  'halle, germany': 'Halle',
  'hamburg, germany': 'Hamburg',
  'london, great britain': 'London',
  'mallorca, spain': 'Mallorca',
  's-hertogenbosch, netherlands': 'Hertogenbosch',
  'stuttgart, germany': 'Stuttgart',
  'winston salem, usa': 'Winston-Salem',
};

/** Public identity includes circuit and level so same-city WTA 125 events stay distinct. */
export function canonicalTournamentName(name: string, year: number, category: string, tour?: Tour) {
  if (lowLevelVenue(name)) return name.trim();
  const wta = tour === 'wta' || /^WTA\b/.test(category);
  const canonical = venueAliases[fold(name)] || name.trim();
  if (wta) {
    const base = canonical.replace(/^WTA\s+/i, '');
    if (category === 'WTA 125' && /^(Madrid|Rome)$/.test(base)) return `${base} 125`;
    if (category === 'WTA 1000' && /^(Madrid|Rome)$/.test(base)) return base;
    if (category === 'WTA 500' && /^(Berlin|Stuttgart|Bad Homburg)$/.test(base)) return base;
    return base;
  }
  return year >= 2023 && (category === 'ATP 500' || category === 'ATP 250') ? atpVenueAliases[fold(canonical)] || canonical : canonical;
}
