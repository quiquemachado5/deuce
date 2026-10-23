/** The provider reports the tier; the ATP calendar repairs missing 2026 values only. */
const official2026: Record<string, string> = {
  almaty: 'ATP 250', brussels: 'ATP 250', lyon: 'ATP 250', auvergne: 'ATP 250',
  chengdu: 'ATP 250', hangzhou: 'ATP 250',
  basel: 'ATP 500', vienna: 'ATP 500', tokyo: 'ATP 500', beijing: 'ATP 500',
  shanghai: 'Masters 1000', paris: 'Masters 1000',
};
// ATP Tour, 2026 calendar: https://www.atptour.com/en/news/what-is-the-2026-atp-tour-calendar/
export function verifiedTournamentCategory(category: string, tournament: string, year: number): string {
  if (category !== 'ATP Tour · nivel no especificado') return category;
  if (year !== 2026) return category;
  const normalized = tournament.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const city = Object.keys(official2026).find((name) => new RegExp(`(^|[^a-z])${name}([^a-z]|$)`).test(normalized));
  return city ? official2026[city] : category;
}

export function visibleTournamentCategory(category: string, tournament: string, year: number): string | null {
  const verified = verifiedTournamentCategory(category, tournament, year);
  return /nivel no especificado/i.test(verified) ? null : verified;
}

export function modernTournamentCategory(tier: unknown, tournament = '', year = 0): string {
  switch (tier) {
    case 'grand_slam': return 'Grand Slam'
    case 'atp_1000': return 'Masters 1000'
    case 'atp_500': return 'ATP 500'
    case 'atp_250': return 'ATP 250'
    default: return verifiedTournamentCategory('ATP Tour · nivel no especificado', tournament, year)
  }
}

/** The older results archive only distinguishes Slam, Masters and general tour. */
export function historicalTournamentCategory(level: unknown, year: number): string {
  if (level === 'G') return 'Grand Slam'
  if (level === 'M') return year < 1990 ? 'Precursores de Masters' : 'Masters 1000'
  if (level === 'A') return 'ATP Tour · nivel no especificado'
  return 'Otro torneo ATP'
}
