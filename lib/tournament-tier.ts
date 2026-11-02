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

/** The older results archive only distinguishes Slam, Masters and general tour. */
export function historicalTournamentCategory(level: unknown, year: number, tour: 'atp' | 'wta' = 'atp'): string {
  if (level === 'G') return 'Grand Slam'
  if (tour === 'wta') {
    if (level === 'PM' || level === 'P' || level === 'F') return 'WTA · alto nivel histórico'
    if (level === 'I' || level === 'W' || level === 'A') return 'WTA Tour histórico'
    if (level === 'C') return 'WTA 125'
    if (typeof level === 'number' || /^\d+$/.test(String(level || ''))) return 'Circuito ITF femenino'
    return 'Otro torneo WTA'
  }
  if (level === 'M') return year < 1990 ? 'Precursores de Masters' : 'Masters 1000'
  if (level === 'A') return 'ATP Tour · nivel no especificado'
  return 'Otro torneo ATP'
}
