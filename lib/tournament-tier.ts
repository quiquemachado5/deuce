/** The provider reports modern tier per match season. Never infer it from the venue name. */
export function modernTournamentCategory(tier: unknown): string {
  switch (tier) {
    case 'grand_slam': return 'Grand Slam'
    case 'atp_1000': return 'Masters 1000'
    case 'atp_500': return 'ATP 500'
    case 'atp_250': return 'ATP 250'
    default: return 'ATP Tour · nivel no especificado'
  }
}

/** The older results archive only distinguishes Slam, Masters and general tour. */
export function historicalTournamentCategory(level: unknown, year: number): string {
  if (level === 'G') return 'Grand Slam'
  if (level === 'M') return year < 1990 ? 'Precursores de Masters' : 'Masters 1000'
  if (level === 'A') return 'ATP Tour · nivel no especificado'
  return 'Otro torneo ATP'
}
