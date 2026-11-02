import test from 'node:test';
import assert from 'node:assert/strict';
import { mockMatches } from '../lib/mocks';
import { browserCategory, browserRound } from '../lib/match-browser';
import { canonicalTournamentName } from '../lib/quality';
import { providerRoundName, providerTeamCompetition, publishableWtaArchiveRow, publishableWtaModernRow } from '../lib/provider-publication';

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
