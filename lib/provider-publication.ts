type ProviderPlayer = {
  is_doubles_team?: unknown;
  tour?: unknown;
};

type ProviderModernRow = {
  tour?: unknown;
  gender?: unknown;
  draw?: unknown;
  is_doubles?: unknown;
  tier?: unknown;
  tournament?: unknown;
  level?: unknown;
  source_id?: unknown;
  players?: {
    p1?: ProviderPlayer;
    p2?: ProviderPlayer;
  };
};

const teamTiers = new Set(['bjk_cup', 'fed_cup', 'united_cup', 'hopman_cup', 'davis_cup', 'atp_cup']);
const teamTournament = /\b(?:billie jean king|bjk|fed|united|hopman|davis|atp) cup\b/i;

/** Team ties are retained in the raw download, outside the singles archive. */
export function providerTeamCompetition(row: ProviderModernRow) {
  const tier = typeof row.tier === 'string' ? row.tier.trim().toLowerCase() : '';
  const tournament = typeof row.tournament === 'string' ? row.tournament : '';
  const level = typeof row.level === 'string' ? row.level.trim().toUpperCase() : '';
  const source = typeof row.source_id === 'string' ? row.source_id.toUpperCase() : '';
  return teamTiers.has(tier)
    || level === 'D'
    || /(?:^|-)FC(?:-|$)/.test(source)
    || teamTournament.test(tournament);
}

/**
 * The WTA feed occasionally includes doubles rows, including one mislabeled
 * men's Davis Cup fixture. Publication is singles-only, so use structural
 * provider fields instead of player or tournament-name blacklists.
 */
export function publishableWtaModernRow(row: ProviderModernRow) {
  return (row.tour === undefined || row.tour === null || row.tour === 'wta')
    && (row.gender === undefined || row.gender === null || row.gender === 'women')
    && !providerTeamCompetition(row)
    && row.draw === 'singles'
    && row.is_doubles !== true
    && (row.players?.p1?.tour === undefined || row.players.p1.tour === null || row.players.p1.tour === 'wta')
    && (row.players?.p2?.tour === undefined || row.players.p2.tour === null || row.players.p2.tour === 'wta')
    && row.players?.p1?.is_doubles_team !== true
    && row.players?.p2?.is_doubles_team !== true;
}

export function publishableWtaArchiveRow(row: ProviderModernRow) {
  return (row.tour === undefined || row.tour === null || row.tour === 'wta')
    && !providerTeamCompetition(row);
}

const providerRounds: Record<string, string> = {
  F: 'Final',
  SF: 'Semifinal',
  QF: 'Cuartos de final',
  R16: 'Octavos de final',
  R32: 'Ronda de 32',
  R64: 'Ronda de 64',
  R128: 'Ronda de 128',
};

export function providerRoundName(value: unknown) {
  const source = typeof value === 'string' ? value.trim() : '';
  return providerRounds[source.toUpperCase()] || source;
}
