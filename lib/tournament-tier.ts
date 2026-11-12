import {finalsIdentity} from './finals-identity';
/** The provider reports the tier; official calendars repair reviewed 2026 gaps only. */
const officialAtp2026: Record<string, string> = {
  almaty: 'ATP 250', brussels: 'ATP 250', lyon: 'ATP 250', auvergne: 'ATP 250',
  chengdu: 'ATP 250', hangzhou: 'ATP 250',
  basel: 'ATP 500', vienna: 'ATP 500', tokyo: 'ATP 500', beijing: 'ATP 500',
  shanghai: 'Masters 1000', paris: 'Masters 1000',
};
const officialWta2026: Record<string, string> = {
  osaka: 'WTA 250',
  ningbo: 'WTA 500',
  tokyo: 'WTA 500',
  guangzhou: 'WTA 250',
  'hong kong': 'WTA 250',
  chennai: 'WTA 250',
};

const normalizedTournament = (value: string) => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

/**
 * Official WTA 1000 honor roll, 2009-2022. The provider's historical `P`
 * cohort combines Premier 5/1000 and Premier/500 events, so the year and
 * tournament are required to separate them without guessing.
 * https://wtafiles.wtatennis.com/pdf/publications/WTA1000RecordBook.pdf
 * https://www.wtatennis.com/news/1922290/wta-unveils-comprehensive-rebrand
 */
const officialWta1000ByYear: Readonly<Record<number, ReadonlySet<string>>> = Object.fromEntries(
  Object.entries({
    2009: ['Dubai', 'Indian Wells', 'Miami', 'Rome', 'Madrid', 'Cincinnati', 'Toronto', 'Tokyo', 'Beijing'],
    2010: ['Dubai', 'Indian Wells', 'Miami', 'Rome', 'Madrid', 'Cincinnati', 'Montreal', 'Tokyo', 'Beijing'],
    2011: ['Dubai', 'Indian Wells', 'Miami', 'Madrid', 'Rome', 'Toronto', 'Cincinnati', 'Tokyo', 'Beijing'],
    2012: ['Doha', 'Indian Wells', 'Miami', 'Madrid', 'Rome', 'Montreal', 'Cincinnati', 'Tokyo', 'Beijing'],
    2013: ['Doha', 'Indian Wells', 'Miami', 'Madrid', 'Rome', 'Toronto', 'Cincinnati', 'Tokyo', 'Beijing'],
    2014: ['Doha', 'Indian Wells', 'Miami', 'Madrid', 'Rome', 'Montreal', 'Cincinnati', 'Wuhan', 'Beijing'],
    2015: ['Dubai', 'Indian Wells', 'Miami', 'Madrid', 'Rome', 'Toronto', 'Cincinnati', 'Wuhan', 'Beijing'],
    2016: ['Doha', 'Indian Wells', 'Miami', 'Madrid', 'Rome', 'Montreal', 'Cincinnati', 'Wuhan', 'Beijing'],
    2017: ['Dubai', 'Indian Wells', 'Miami', 'Madrid', 'Rome', 'Toronto', 'Cincinnati', 'Wuhan', 'Beijing'],
    2018: ['Doha', 'Indian Wells', 'Miami', 'Madrid', 'Rome', 'Montreal', 'Cincinnati', 'Wuhan', 'Beijing'],
    2019: ['Dubai', 'Indian Wells', 'Miami', 'Madrid', 'Rome', 'Toronto', 'Cincinnati', 'Wuhan', 'Beijing'],
    2020: ['Doha', 'Cincinnati', 'Rome'],
    2021: ['Dubai', 'Miami', 'Madrid', 'Rome', 'Montreal', 'Cincinnati', 'Indian Wells'],
    2022: ['Doha', 'Indian Wells', 'Miami', 'Madrid', 'Rome', 'Toronto', 'Cincinnati', 'Guadalajara 2'],
  }).map(([year, names]) => [Number(year), new Set(names.map(normalizedTournament))]),
);

/**
 * Official ATP 500 calendar by season since the category was introduced in
 * 2009. The historical provider groups ATP 500 and ATP 250 events together
 * under level `A`, so the edition year is required to publish the two tiers
 * without relabelling earlier eras.
 * https://www.atptour.com/en/media/mediaguide/
 */
const officialAtp500ByYear: Readonly<Record<number, ReadonlySet<string>>> = Object.fromEntries(
  Object.entries({
    2009: ['Rotterdam', 'Memphis', 'Acapulco', 'Dubai', 'Barcelona', 'Hamburg', 'Washington', 'Beijing', 'Tokyo', 'Basel', 'Valencia'],
    2010: ['Rotterdam', 'Memphis', 'Acapulco', 'Dubai', 'Barcelona', 'Hamburg', 'Washington', 'Beijing', 'Tokyo', 'Basel', 'Valencia'],
    2011: ['Rotterdam', 'Memphis', 'Acapulco', 'Dubai', 'Barcelona', 'Hamburg', 'Washington', 'Beijing', 'Tokyo', 'Basel', 'Valencia'],
    2012: ['Rotterdam', 'Memphis', 'Acapulco', 'Dubai', 'Barcelona', 'Hamburg', 'Washington', 'Beijing', 'Tokyo', 'Basel', 'Valencia'],
    2013: ['Rotterdam', 'Memphis', 'Acapulco', 'Dubai', 'Barcelona', 'Hamburg', 'Washington', 'Beijing', 'Tokyo', 'Basel', 'Valencia'],
    2014: ['Rotterdam', 'Rio de Janeiro', 'Acapulco', 'Dubai', 'Barcelona', 'Hamburg', 'Washington', 'Beijing', 'Tokyo', 'Basel', 'Valencia'],
    2015: ['Rotterdam', 'Rio de Janeiro', 'Acapulco', 'Dubai', 'Barcelona', 'Halle', "Queen's Club", 'Hamburg', 'Washington', 'Beijing', 'Tokyo', 'Vienna', 'Basel'],
    2016: ['Rotterdam', 'Rio de Janeiro', 'Acapulco', 'Dubai', 'Barcelona', 'Halle', "Queen's Club", 'Hamburg', 'Washington', 'Beijing', 'Tokyo', 'Vienna', 'Basel'],
    2017: ['Rotterdam', 'Rio de Janeiro', 'Acapulco', 'Dubai', 'Barcelona', 'Halle', "Queen's Club", 'Hamburg', 'Washington', 'Beijing', 'Tokyo', 'Vienna', 'Basel'],
    2018: ['Rotterdam', 'Rio de Janeiro', 'Acapulco', 'Dubai', 'Barcelona', 'Halle', "Queen's Club", 'Hamburg', 'Washington', 'Beijing', 'Tokyo', 'Vienna', 'Basel'],
    2019: ['Rotterdam', 'Rio de Janeiro', 'Acapulco', 'Dubai', 'Barcelona', 'Halle', "Queen's Club", 'Hamburg', 'Washington', 'Beijing', 'Tokyo', 'Vienna', 'Basel'],
    2020: ['Rotterdam', 'Rio de Janeiro', 'Acapulco', 'Dubai', 'Hamburg', 'St Petersburg', 'Vienna'],
    2021: ['Rotterdam', 'Acapulco', 'Dubai', 'Barcelona', 'Halle', "Queen's Club", 'Hamburg', 'Washington', 'Vienna'],
    2022: ['Rotterdam', 'Rio de Janeiro', 'Acapulco', 'Dubai', 'Barcelona', 'Halle', "Queen's Club", 'Hamburg', 'Washington', 'Tokyo', 'Astana', 'Vienna', 'Basel'],
  }).map(([year, names]) => [Number(year), new Set(names.map(normalizedTournament))]),
);

const nonRankingAtpEventsByYear: Readonly<Record<number, ReadonlySet<string>>> = Object.fromEntries(
  Object.entries({
    // Düsseldorf hosted the World Team Cup through 2012, then became a
    // regular ATP 250 singles tournament in 2013-14.
    2009: ['Dusseldorf'], 2010: ['Dusseldorf'], 2011: ['Dusseldorf'],
    2012: ['Dusseldorf', 'London Olympics'],
    2016: ['Rio Olympics'],
    2017: ['Laver Cup'], 2018: ['Laver Cup'], 2019: ['Laver Cup'],
    2020: ['Atp Cup'],
    2021: ['Atp Cup', 'Laver Cup', 'NextGen Finals', 'Tokyo Olympics'],
    2022: ['Atp Cup', 'Laver Cup', 'NextGen Finals'],
  }).map(([year, names]) => [Number(year), new Set(names.map(normalizedTournament))]),
);

const historicalAtpGeneralCategory = (year: number, tournament: string) => {
  const normalized = normalizedTournament(tournament);
  if (year < 2009 || year > 2022 || nonRankingAtpEventsByYear[year]?.has(normalized)) {
    return 'ATP Tour · nivel no especificado';
  }
  const withoutProviderPrefix = normalized.replace(/^atp /, '');
  return officialAtp500ByYear[year]?.has(withoutProviderPrefix) ? 'ATP 500' : 'ATP 250';
};

export function historicalWtaTournamentCategory(level: unknown, year: number, tournament = ''): string {
  if (level === 'G') return 'Grand Slam';
  if (finalsIdentity({tour:'wta',level,tournament,event_date:`${year}-01-01`})) return 'WTA Finals';
  if (/^(?:Zhuhai|Tournament of Champions)$/i.test(tournament)) return 'WTA Elite Trophy';
  // The source files retain T1-T5. These present-day navigation buckets are
  // explicit normalisations, not a rewrite of the historical provider tier.
  // WTA records group Tier I/II as Premier and Tier III/IV/V as International:
  // https://wtafiles.wtatennis.com/pdf/publications/WTA24MG_RecordBook.pdf
  if (year >= 1995 && year <= 2008) {
    if (level === 'T1') return 'WTA 1000';
    if (level === 'T2') return 'WTA 500';
    if (['T3', 'T4', 'T5'].includes(String(level))) return 'WTA 250';
  }
  if (year >= 2009 && year <= 2022) {
    if (level === 'PM') return 'WTA 1000';
    if (level === 'P') return officialWta1000ByYear[year]?.has(normalizedTournament(tournament)) ? 'WTA 1000' : 'WTA 500';
    if (level === 'I') return 'WTA 250';
  }
  if (level === 'C') return 'WTA 125';
  if (typeof level === 'number' || /^\d+$/.test(String(level || ''))) return 'Circuito ITF femenino';
  return level === 'W' || level === 'A' ? 'WTA Tour histórico' : 'Otro torneo WTA';
}
// ATP Tour, 2026 calendar: https://www.atptour.com/en/news/what-is-the-2026-atp-tour-calendar/
// WTA Tour, 2026 calendar: https://wtafiles.wtatennis.com/pdf/calendar/calendar.pdf
export function verifiedTournamentCategory(category: string, tournament: string, year: number): string {
  const wta = category === 'WTA · nivel no especificado';
  if (!wta && category !== 'ATP Tour · nivel no especificado') return category;
  if (year !== 2026) return category;
  const normalized = tournament.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const reviewed = wta ? officialWta2026 : officialAtp2026;
  const city = Object.keys(reviewed).find((name) => new RegExp(`(^|[^a-z])${name}([^a-z]|$)`).test(normalized));
  return city ? reviewed[city] : category;
}

export function visibleTournamentCategory(category: string, tournament: string, year: number): string | null {
  const verified = verifiedTournamentCategory(category, tournament, year);
  return /nivel no especificado/i.test(verified) ? null : verified;
}

export function modernTournamentCategory(tier: unknown, tournament = '', year = 0, tour: 'atp' | 'wta' = 'atp'): string {
  switch (tier) {
    case 'atp_finals': return tour==='atp'?'ATP Finals':'Otro torneo WTA'
    case 'wta_finals': return tour==='wta'?'WTA Finals':'Otro torneo ATP'
    case 'grand_slam': return 'Grand Slam'
    case 'atp_1000': return 'Masters 1000'
    case 'atp_500': return 'ATP 500'
    case 'atp_250': return 'ATP 250'
    case 'wta_1000': return 'WTA 1000'
    case 'wta_500': return 'WTA 500'
    case 'wta_250': return 'WTA 250'
    case 'wta_125': return 'WTA 125'
    default: return verifiedTournamentCategory(tour === 'wta' ? 'WTA · nivel no especificado' : 'ATP Tour · nivel no especificado', tournament, year)
  }
}

/** The older results archive distinguishes Slam, Masters and general tour. */
export function historicalTournamentCategory(level: unknown, year: number, tour: 'atp' | 'wta' = 'atp', tournament = ''): string {
  if (level === 'G') return 'Grand Slam'
  if (tour === 'wta') return historicalWtaTournamentCategory(level, year, tournament)
  if (finalsIdentity({tour,level,tournament,event_date:`${year}-01-01`})) return 'ATP Finals'
  if (level === 'M') return year < 1990 ? 'Precursores de Masters' : 'Masters 1000'
  if (level === 'A') return historicalAtpGeneralCategory(year, tournament)
  return 'Otro torneo ATP'
}
