import test from 'node:test';
import assert from 'node:assert/strict';
import { mockMatches } from '../lib/mocks';
import { browserCategory, browserRound } from '../lib/match-browser';
import { canonicalTournamentName, prepareMatch } from '../lib/quality';
import { providerRoundName, providerTeamCompetition, publishableWtaArchiveRow, publishableWtaModernRow } from '../lib/provider-publication';
import { providerTournamentName } from '../lib/tournament-identity';
import { historicalTournamentCategory, modernTournamentCategory } from '../lib/tournament-tier';
import { editionCompleteness, normalizeEditionAudits, type EditionAudit } from '../lib/edition-audit';

const match = mockMatches[0];

test('WTA publication admits only structurally verified singles rows', () => {
  assert.equal(publishableWtaModernRow({ tour: 'wta', gender: 'women', draw: 'singles', is_doubles: false }), true);
  assert.equal(publishableWtaModernRow({
    tour: 'wta',
    gender: 'women',
    draw: 'singles',
    is_doubles: false,
    players: { p1: {}, p2: {} },
  }), true);
  assert.equal(publishableWtaModernRow({ tour: 'wta', gender: 'women', draw: 'doubles', is_doubles: true }), false);
  assert.equal(publishableWtaModernRow({ tour: 'wta', gender: 'men', draw: 'singles', is_doubles: false }), false);
  assert.equal(publishableWtaModernRow({ tour: 'atp', gender: 'women', draw: 'singles', is_doubles: false }), false);
  assert.equal(publishableWtaModernRow({ tour: 'wta', gender: 'women', draw: 'singles', is_doubles: false, players: { p1: { tour: 'atp' }, p2: { tour: 'wta' } } }), false);
  assert.equal(publishableWtaModernRow({
    tour: 'wta',
    gender: 'women',
    draw: 'doubles',
    is_doubles: true,
    players: { p1: { is_doubles_team: true }, p2: { is_doubles_team: true } },
  }), false);
  assert.equal(publishableWtaModernRow({ tour: 'wta', gender: 'women', is_doubles: false }), false);
});

test('team competitions stay in the raw download and out of the WTA singles archive', () => {
  const modern = { tour: 'wta', gender: 'women', draw: 'singles', is_doubles: false } as const;
  assert.equal(publishableWtaModernRow({ ...modern, tier: 'bjk_cup', tournament: 'WTA Billie Jean King Cup - Group I' }), false);
  assert.equal(publishableWtaModernRow({ ...modern, tier: 'united_cup', tournament: 'United Cup' }), false);
  assert.equal(publishableWtaModernRow({ ...modern, tier: 'exhibition', tournament: 'WTA Hopman Cup' }), false);
  assert.equal(providerTeamCompetition({ level: 'D', source_id: 'wta:2018-W-FC-2018-G2', tournament: 'Fed Cup G2 RR' }), true);
  assert.equal(publishableWtaArchiveRow({ tour: 'wta', level: 'D', tournament: 'Fed Cup WG F' }), false);
  assert.equal(publishableWtaArchiveRow({ tour: 'wta', level: 'A', tournament: 'Brisbane' }), true);
});

test('provider round codes are normalized without leaking a raw lowercase final', () => {
  assert.equal(providerRoundName('f'), 'Final');
  assert.equal(browserRound({ ...match, round: 'f' }), 'Final');
});

test('the browser keeps WTA season finals separate from ATP Finals', () => {
  assert.equal(browserCategory({ ...match, tour: 'wta', tournament: 'WTA Finals - Riyadh' }), 'WTA Finals');
  assert.equal(browserCategory({ ...match, tour: 'wta', tournament: 'Finals - Riyadh' }), 'WTA Finals');
  assert.equal(browserCategory({ ...match, tour: 'atp', tournament: 'ATP Finals' }), 'ATP Finals');
});

test('known Bad Homburg provider aliases share one tournament identity', () => {
  for (const name of ['Bad Homburg', 'Bad Homburg, Germany', 'Bad Homburg Open', 'Bad Homburg, Germany, Doubles']) {
    assert.equal(canonicalTournamentName(name, 2026, 'WTA 500'), 'Bad Homburg');
  }
});

test('tour-level WTA country suffixes do not split one edition into two draws', () => {
  assert.equal(canonicalTournamentName('Strasbourg, France', 2026, 'WTA 500', 'wta'), 'Strasbourg');
  assert.equal(canonicalTournamentName('Strasbourg', 2026, 'WTA 500', 'wta'), 'Strasbourg');
  assert.equal(canonicalTournamentName('S-Hertogenbosch, Netherlands', 2026, 'WTA 250', 'wta'), 'Hertogenbosch');
  assert.equal(canonicalTournamentName('Hertogenbosch', 2026, 'WTA 250', 'wta'), 'Hertogenbosch');
});

test('stored audits merge reviewed venue aliases without certifying the whole draw', () => {
  const audit = (tournament: string, rounds: Record<string, number>): EditionAudit => {
    const row = {
      tournament, tour: 'wta' as const, year: 2026, category: 'WTA 500', sourceRows: 1,
      completed: 1, terminal: 0, pending: 0, hasFinal: Boolean(rounds['7']), rounds,
      expectedLateRounds: true, missingLateRounds: [], completeDraw: false as boolean | null,
    };
    return { ...row, ...editionCompleteness(row) };
  };
  const merged = normalizeEditionAudits([
    audit('Strasbourg, France', { '5': 3 }),
    audit('Strasbourg', { '5': 1, '6': 2, '7': 1 }),
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].tournament, 'Strasbourg');
  assert.deepEqual(merged[0].rounds, { '5': 4, '6': 2, '7': 1 });
  assert.deepEqual(merged[0].missingLateRounds, []);
  assert.equal(merged[0].completeDraw, null);
});

test('WTA identities join country aliases without merging 125 or ITF events', () => {
  assert.equal(canonicalTournamentName('WTA Berlin', 2026, 'WTA 500', 'wta'), 'Berlin');
  assert.equal(canonicalTournamentName('Berlin, Germany', 2026, 'WTA 500', 'wta'), 'Berlin');
  assert.equal(canonicalTournamentName('Madrid (Spain)', 2026, 'WTA 1000', 'wta'), 'Madrid');
  assert.equal(canonicalTournamentName('Madrid (Spain)', 2026, 'WTA 125', 'wta'), 'Madrid 125');
  assert.equal(canonicalTournamentName('Rome', 2026, 'WTA 125', 'wta'), 'Rome 125');
  assert.equal(providerTournamentName('W15 Madrid', { tour: 'wta', level: 15 }), 'W15 Madrid');
  assert.equal(providerTournamentName('Rome $60K', { tour: 'wta', level: 60 }), 'Rome $60K');
});

test('historical WTA levels publish conservative circuit categories', () => {
  assert.equal(historicalTournamentCategory('T1', 2008, 'wta', 'Miami'), 'WTA 1000');
  assert.equal(historicalTournamentCategory('T2', 2008, 'wta', 'Dubai'), 'WTA 500');
  assert.equal(historicalTournamentCategory('T4', 2008, 'wta', 'Prague'), 'WTA 250');
  assert.equal(historicalTournamentCategory('PM', 2019, 'wta', 'Miami'), 'WTA 1000');
  assert.equal(historicalTournamentCategory('P', 2019, 'wta', 'Rome'), 'WTA 1000');
  assert.equal(historicalTournamentCategory('P', 2019, 'wta', 'Stuttgart'), 'WTA 500');
  assert.equal(historicalTournamentCategory('I', 2019, 'wta', 'Auckland'), 'WTA 250');
  assert.equal(historicalTournamentCategory('P', 2015, 'wta', 'Zhuhai'), 'WTA Finals');
  assert.equal(historicalTournamentCategory('C', 2019, 'wta'), 'WTA 125');
  assert.equal(historicalTournamentCategory(25, 2019, 'wta'), 'Circuito ITF femenino');
});

test('historical ATP general-tour editions separate ATP 500 and ATP 250 from 2009', () => {
  assert.equal(historicalTournamentCategory('A', 2008, 'atp', 'Barcelona'), 'ATP Tour · nivel no especificado');
  assert.equal(historicalTournamentCategory('A', 2009, 'atp', 'Barcelona'), 'ATP 500');
  assert.equal(historicalTournamentCategory('A', 2009, 'atp', 'Doha'), 'ATP 250');
  assert.equal(historicalTournamentCategory('A', 2014, 'atp', 'Rio de Janeiro'), 'ATP 500');
  assert.equal(historicalTournamentCategory('A', 2014, 'atp', "Queen's Club"), 'ATP 250');
  assert.equal(historicalTournamentCategory('A', 2015, 'atp', "Queen's Club"), 'ATP 500');
  assert.equal(historicalTournamentCategory('A', 2020, 'atp', 'ATP Rio de Janeiro'), 'ATP 500');
  assert.equal(historicalTournamentCategory('A', 2020, 'atp', 'St Petersburg'), 'ATP 500');
  assert.equal(historicalTournamentCategory('A', 2021, 'atp', 'St. Petersburg'), 'ATP 250');
  assert.equal(historicalTournamentCategory('A', 2022, 'atp', 'Astana'), 'ATP 500');
});

test('historical ATP special events are not relabelled as ATP 250', () => {
  for (const [year, tournament] of [
    [2009, 'Dusseldorf'], [2012, 'London Olympics'], [2017, 'Laver Cup'],
    [2020, 'Atp Cup'], [2021, 'NextGen Finals'], [2021, 'Tokyo Olympics'],
  ] as const) {
    assert.equal(historicalTournamentCategory('A', year, 'atp', tournament), 'ATP Tour · nivel no especificado');
  }
  assert.equal(historicalTournamentCategory('A', 2013, 'atp', 'Dusseldorf'), 'ATP 250');
});

test('official 2026 WTA calendar repairs the provider tier gaps without widening unknown events', () => {
  const expected = new Map([
    ['Osaka', 'WTA 250'], ['Ningbo', 'WTA 500'], ['Tokyo', 'WTA 500'],
    ['Guangzhou', 'WTA 250'], ['Hong Kong', 'WTA 250'], ['Chennai', 'WTA 250'],
  ]);
  for (const [tournament, category] of expected) {
    assert.equal(modernTournamentCategory(null, tournament, 2026, 'wta'), category);
  }
  assert.equal(modernTournamentCategory(null, 'Vancouver, Canada', 2026, 'wta'), 'WTA · nivel no especificado');
  assert.equal(modernTournamentCategory(null, 'Tokyo', 2025, 'wta'), 'WTA · nivel no especificado');
});

test('reviewed WTA editions repair only year- and level-specific surfaces', () => {
  const edition = (tournament: string, year: number, category: string, surface: typeof match.surface) => prepareMatch({
    ...match, match_id: `wta-${tournament}-${year}-${category}`, tour: 'wta', tournament, year, category, surface,
    context: { ...match.context },
  });
  const berlin = edition('Berlin, Germany', 2026, 'WTA 500', 'clay');
  assert.equal(berlin.tournament, 'Berlin');
  assert.equal(berlin.surface, 'grass');
  assert.ok(berlin.context?.metadataSources?.some(source => source.field === 'Superficie' && source.url.includes('/berlin/')));
  const stuttgart = edition('WTA Stuttgart', 2026, 'WTA 500', 'grass');
  assert.equal(stuttgart.surface, 'clay');
  assert.equal(stuttgart.context?.indoor, true);
  assert.equal(edition('Madrid', 2026, 'WTA 1000', 'hard').surface, 'clay');
  assert.equal(edition('Rome', 2026, 'WTA 1000', 'hard').surface, 'clay');
  assert.equal(edition('Berlin', 2019, 'WTA · alto nivel histórico', 'clay').surface, 'clay');
  assert.equal(edition('Stuttgart', 2008, 'WTA · alto nivel histórico', 'hard').surface, 'hard');
  assert.equal(edition('W15 Madrid', 2020, 'Circuito ITF femenino', 'hard').tournament, 'W15 Madrid');
});
