import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mockMatches } from '../lib/mocks';
import { homeSelection, homeSelectionFromIndex, prepareHomeIndex } from '../lib/deuce-home';
import { archiveFreshnessSummary } from '../lib/archive-freshness';
import { matchDatePresentation, reviewMatchDate } from '../lib/match-date';
import { chronological } from '../lib/editorial';
import { recordsCanonical, recordsHaveTransientState, recordsUrl } from '../lib/records-url';
import { matchSitemapEntries, SITEMAP_STATIC_PATHS, sitemapIndexLocations, sitemapLocation } from '../lib/sitemap-locations';
import { breadcrumbJsonLd, itemListJsonLd, matchCanonicalPath, matchHasTransientState, matchJsonLd, playerProfileJsonLd, robotsForUnavailableTour, tournamentSeriesJsonLd } from '../lib/seo-metadata';
import { tournamentDirectoryUrl, tournamentEditionCanonicalPaths } from '../lib/tournament-url';
import { matchContextReferences, verifiedContext } from '../lib/verified-context';
import type { Match } from '../lib/types';
import { SITE_ORIGIN } from '../lib/site-origin';

const requireFromTest = createRequire(import.meta.url);
const { resolveSitemap } = requireFromTest('../node_modules/next/dist/build/webpack/loaders/metadata/resolve-route-data.js') as {
  resolveSitemap: (items: Array<{ url: string }>) => string;
};

const base = { ...mockMatches[0], data_source: 'reference' as const };

test('Next sitemap serialization keeps query URLs valid and excludes the noindex comparison route', () => {
  const url = sitemapLocation('/records?dato=top-10&tour=wta');
  const xml = resolveSitemap([{ url }]);
  assert.ok(xml.includes(`<loc>${SITE_ORIGIN}/records?dato=top-10&amp;tour=wta</loc>`));
  assert.doesNotMatch(xml, /&(?!(?:amp|lt|gt|quot|apos);)/);
  assert.equal((SITEMAP_STATIC_PATHS as readonly string[]).includes('/comparar'), false);
  assert.equal((SITEMAP_STATIC_PATHS as readonly string[]).includes('/buscar'), false);
});

test('the sitemap index groups the canonical sitemap and every annual match sitemap', () => {
  const locations = sitemapIndexLocations(1970);
  assert.deepEqual(locations, [
    `${SITE_ORIGIN}/sitemap.xml`,
    `${SITE_ORIGIN}/match/sitemap/1968.xml`,
    `${SITE_ORIGIN}/match/sitemap/1969.xml`,
    `${SITE_ORIGIN}/match/sitemap/1970.xml`,
  ]);
  assert.equal(new Set(locations).size, locations.length);
});

test('entity JSON-LD exposes canonical tennis entities without inventing missing dates', () => {
  const match = matchJsonLd({ ...base, match_id:'seo-match', tour:'wta', context:undefined });
  assert.equal(match['@type'], 'SportsEvent');
  assert.equal(match.url, `${SITE_ORIGIN}/match/seo-match`);
  assert.equal('startDate' in match, false);
  assert.deepEqual((match.competitor as Array<{ '@type':string }>).map(person=>person['@type']), ['Person','Person']);

  const approximate = matchJsonLd({ ...base, match_id:'approximate-seo-match', context:{date:'2022-05-23',dateLabel:'Inicio del torneo'} });
  assert.equal('startDate' in approximate, false);
  const exact = matchJsonLd({ ...base, match_id:'exact-seo-match', context:{date:'2022-05-31',endDate:'2022-06-01',dateLabel:'Fecha del partido'} });
  assert.equal(exact.startDate, '2022-05-31');
  assert.equal(exact.endDate, '2022-06-01');

  const player = playerProfileJsonLd({name:'Aryna Sabalenka',slug:'aryna-sabalenka',tour:'wta',description:'Perfil documentado'});
  assert.equal(player['@type'], 'ProfilePage');
  assert.equal((player.mainEntity as {url:string}).url, `${SITE_ORIGIN}/jugadores/aryna-sabalenka?tour=wta`);

  const tournament = tournamentSeriesJsonLd({name:'Wimbledon',slug:'wimbledon',category:'Grand Slam',tour:'atp',years:[2026,2025],description:'Ediciones documentadas'});
  assert.equal(tournament['@type'], 'EventSeries');
  assert.equal((tournament.subEvent as Array<unknown>).length, 2);

  const breadcrumbs = breadcrumbJsonLd([{name:'Inicio',path:'/'},{name:'Partidos',path:'/buscar'}]);
  const list = itemListJsonLd('Historias',[{name:'Una final',path:'/match/seo-match'}]);
  assert.equal((breadcrumbs.itemListElement as Array<unknown>).length, 2);
  assert.equal(list.numberOfItems, 1);
});

test('canonical archive URLs discard default circuits and transient UI state', () => {
  assert.equal(recordsUrl({ tour: 'atp' }), '/records');
  assert.equal(recordsCanonical({ dato: 'top-10', tour: 'atp', year: '2024', page: '3' }), '/records?dato=top-10');
  assert.equal(recordsCanonical({ dato: 'top-10', tour: 'wta', sort: 'sample' }), '/records?dato=top-10&tour=wta');
  assert.equal(recordsHaveTransientState({ dato: 'top-10', tour: 'atp' }), false);
  assert.equal(recordsHaveTransientState({ dato: 'top-10', page: '2' }), true);
  assert.equal(tournamentDirectoryUrl('atp'), '/torneos');
  assert.equal(tournamentDirectoryUrl('atp', 'ATP 250'), '/torneos?categoria=ATP+250');
  assert.equal(matchCanonicalPath('archive-1'), '/match/archive-1');
  assert.equal(matchHasTransientState({ junto: 'archive-2' }), true);
  assert.equal(matchHasTransientState({ junto: 'elige' }), true);
  assert.equal(matchHasTransientState({ vista: 'presion' }), true);
});

test('WTA archive roots stay noindex until their own rows are published', () => {
  const empty = { tours: { atp: 20, wta: 0 } };
  const published = { tours: { atp: 20, wta: 1 } };
  assert.deepEqual(robotsForUnavailableTour(empty, 'wta'), { index: false, follow: true });
  assert.equal(robotsForUnavailableTour(empty, 'atp'), undefined);
  assert.equal(robotsForUnavailableTour(published, 'wta'), undefined);
});

test('edition sitemap paths match every canonical category and circuit variant', () => {
  const matches: Match[] = [
    { ...base, match_id: 'canada-legacy', tournament: 'Canada', year: 1972, category: 'ATP Tour · nivel no especificado' },
    { ...base, match_id: 'canada-masters', tournament: 'Canada', year: 1972, category: 'Precursores de Masters' },
    { ...base, match_id: 'canada-wta', tournament: 'Canada', year: 1972, category: 'WTA Tour histórico', tour: 'wta' },
  ];
  assert.deepEqual(new Set(tournamentEditionCanonicalPaths('canada', matches)), new Set([
    '/torneos/canada/1972?categoria=ATP+Tour+%C2%B7+nivel+no+especificado',
    '/torneos/canada/1972?categoria=Precursores+de+Masters',
    '/torneos/canada/1972?categoria=WTA+Tour+hist%C3%B3rico&cuadro=wta',
  ]));
});

test('match sitemap lastmod uses the verified sporting date and omits approximate dates', () => {
  const matches: Match[] = [
    { ...base, match_id: 'approximate', year: 2022, context: { date: '2022-05-23', dateLabel: 'Inicio del torneo' } },
    { ...base, match_id: 'exact', year: 2022, context: { date: '2022-05-31', dateLabel: 'Fecha del partido' } },
    { ...base, match_id: 'other-year', year: 2021 },
  ];
  const entries = matchSitemapEntries(matches, 2022);
  assert.equal(entries.length, 4);
  assert.deepEqual(entries.map(entry => entry.url), [
    `${SITE_ORIGIN}/match/approximate`,
    `${SITE_ORIGIN}/en/matches/approximate`,
    `${SITE_ORIGIN}/match/exact`,
    `${SITE_ORIGIN}/en/matches/exact`,
  ]);
  assert.deepEqual(entries.map(entry => entry.lastModified), [undefined, undefined, '2022-05-31T12:00:00.000Z', '2022-05-31T12:00:00.000Z']);
  assert.ok(entries.every(entry => entry.changeFrequency === 'never' && entry.priority === 0.5));
  assert.ok(entries.every(entry => entry.alternates?.languages?.es && entry.alternates.languages.en));
});

test('a tournament start is shown as an edition, never as an exact match day', () => {
  const approximate = matchDatePresentation({
    date: '2022-05-23',
    dateLabel: 'Inicio del torneo',
    year: 2022,
    tournament: 'Roland Garros',
  });
  assert.equal(approximate.exact, false);
  assert.equal(approximate.long, 'Edición 2022');
  assert.equal(approximate.dateTime, undefined);

  const exact = matchDatePresentation({
    date: '2022-05-31',
    dateLabel: 'Fecha del partido',
    year: 2022,
    tournament: 'Roland Garros',
  });
  assert.equal(exact.exact, true);
  assert.equal(exact.dateTime, '2022-05-31');
  assert.match(exact.long, /31 de mayo de 2022/i);
  assert.equal(reviewMatchDate({ date: '2022-05-23', dateLabel: 'Inicio del torneo', year: 2022, tournament: 'Roland Garros' }), 'Edición 2022');
  assert.equal(reviewMatchDate({ date: '2022-05-31', dateLabel: 'Fecha del partido', year: 2022, tournament: 'Roland Garros' }), '2022-05-31');
});

test('reviewed Roland Garros meetings replace edition starts with their official match dates', () => {
  for (const [year, expected] of [[2021, '2021-06-11'], [2022, '2022-05-31']] as const) {
    const reference = matchContextReferences.find(item => item.tournament === 'Roland Garros' && item.year === year)!;
    const input: Match = {
      ...base,
      tournament: reference.tournament,
      year: reference.year,
      player1: { name: reference.players[0], seed: null },
      player2: { name: reference.players[1], seed: null },
      score_summary: { ...base.score_summary, games: reference.games },
      context: { date: `${year}-05-01`, dateLabel: 'Inicio del torneo' },
    };
    const match = verifiedContext(input);
    assert.equal(match.context?.date, expected);
    assert.equal(match.context?.dateLabel, 'Fecha del partido');
    assert.ok(match.context?.metadataSources?.some(source => source.url === reference.source));
  }
});

test('the newest eligible result remains first when there is no separate featured final', () => {
  const rows: Match[] = [
    { ...base, match_id: 'newest', year: 2026, round: 'Semifinal', context: { date: '2026-10-16', dateLabel: 'Fecha del partido' } },
    { ...base, match_id: 'older', year: 2026, round: 'Cuartos de final', context: { date: '2026-10-15', dateLabel: 'Fecha del partido' } },
    { ...base, match_id: 'oldest', year: 2026, round: 'Ronda de 32', context: { date: '2026-10-14', dateLabel: 'Fecha del partido' } },
    { ...base, match_id: 'spare', year: 2026, round: 'Ronda de 64', context: { date: '2026-10-13', dateLabel: 'Fecha del partido' } },
  ];
  const today = new Date('2026-11-01T12:00:00Z');
  assert.equal(homeSelection(rows, today).latest[0]?.match_id, 'newest');
  assert.equal(homeSelectionFromIndex(prepareHomeIndex(rows), today).latest[0]?.match_id, 'newest');
});

test('exact results keep their real intraday order while approximate editions use round order', () => {
  const exact: Match[] = [
    { ...base, match_id: 'morning', year: 2026, round: 'Octavos de final', context: { date: '2026-10-14T04:10:00Z', dateLabel: 'Fecha del partido' } },
    { ...base, match_id: 'noon', year: 2026, round: 'Octavos de final', context: { date: '2026-10-14T11:55:00Z', dateLabel: 'Fecha del partido' } },
    { ...base, match_id: 'mid', year: 2026, round: 'Octavos de final', context: { date: '2026-10-14T10:10:00Z', dateLabel: 'Fecha del partido' } },
  ];
  assert.deepEqual([...exact].sort((a, b) => chronological(b, a)).map(match => match.match_id), ['noon', 'mid', 'morning']);
  const today = new Date('2026-11-01T12:00:00Z');
  assert.deepEqual(homeSelection(exact, today).latest.map(match => match.match_id), ['noon', 'mid', 'morning']);
  assert.deepEqual(homeSelectionFromIndex(prepareHomeIndex(exact), today).latest.map(match => match.match_id), ['noon', 'mid', 'morning']);

  const approximate: Match[] = [
    { ...base, match_id: 'early-round', year: 1972, round: 'Primera ronda', context: { date: '1972-08-14T23:00:00Z', dateLabel: 'Inicio del torneo' } },
    { ...base, match_id: 'final', year: 1972, round: 'Final', context: { date: '1972-08-14T08:00:00Z', dateLabel: 'Inicio del torneo' } },
  ];
  assert.deepEqual([...approximate].sort((a, b) => chronological(b, a)).map(match => match.match_id), ['final', 'early-round']);
});

test('freshness reports copy age separately from the last exact match date', () => {
  const summary = archiveFreshnessSummary({
    generatedAt: '2026-11-01T05:00:00Z',
    extent: { latestExactDate: '2026-10-16', latestEditionDate: '2026-10-27' },
  }, Date.parse('2026-11-01T17:00:00Z'));
  assert.equal(summary.copyAgeHours, 12);
  assert.equal(summary.latestExactDate, '2026-10-16');
  assert.equal(summary.latestEditionDate, '2026-10-27');
});
