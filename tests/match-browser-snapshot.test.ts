import test from 'node:test';
import assert from 'node:assert/strict';
import { mockMatches } from '../lib/mocks';
import { browserPartitionMatchesDetails, compileMatchBrowser, decodeMatchBrowserRow, queryMatchBrowser, queryMatchBrowserPage } from '../lib/match-browser-snapshot';
import { sentence } from '../lib/cuaderno/model';
import { proofSummary } from '../lib/revista/snapshot';
import type { Match } from '../lib/types';

const fixture = (id: string, tour: 'atp' | 'wta', year: number, date: string, extra: Partial<Match> = {}): Match => ({
  ...mockMatches[0],
  match_id: id,
  tour,
  year,
  tournament: tour === 'wta' ? 'US Open' : 'Wimbledon',
  category: 'Grand Slam',
  surface: tour === 'wta' ? 'hard' : 'grass',
  player1: { name: tour === 'wta' ? 'Aryna Sabalenka' : 'Carlos Alcaraz', seed: 1 },
  player2: { name: tour === 'wta' ? 'Iga Swiatek' : 'Jannik Sinner', seed: 2 },
  round: 'Final',
  statistics: tour === 'atp' ? mockMatches[0].statistics : [],
  point_tape: [],
  context: { date, dateLabel: 'Fecha del partido', format: 'BO3' },
  score_summary: { ...mockMatches[0].score_summary, timestamp: `${date}T12:00:00Z`, games: [[6, 4], [6, 4]] },
  ...extra,
});

test('match browser snapshot partitions compact rows and preserves listing capabilities', () => {
  const matches = [fixture('atp-2026', 'atp', 2026, '2026-10-02'), fixture('wta-2026', 'wta', 2026, '2026-11-02'), fixture('atp-2016', 'atp', 2016, '2016-07-10')];
  const browser = compileMatchBrowser(matches);
  assert.equal(browser.index.count, matches.length);
  assert.deepEqual(browser.index.partitions.map(partition => partition.id), ['matches-atp-2020s', 'matches-wta-2020s', 'matches-atp-2010s']);
  assert.equal(browser.partitions.reduce((sum, partition) => sum + partition.rows.length, 0), matches.length);
  const atp = browser.partitions.find(partition => partition.id === 'matches-atp-2020s')!;
  const decoded = decodeMatchBrowserRow(atp, atp.rows[0]);
  assert.equal(decoded.match_id, 'atp-2026');
  assert.equal(decoded.listingCapabilities?.statistics, true);
  assert.deepEqual(decoded.statistics, []);
});

test('compact navigation stays materially smaller than full match detail', () => {
  const matches = Array.from({ length: 100 }, (_, index) => ({
    ...mockMatches[0],
    match_id: `size-${index}`,
    tour: index % 2 ? 'atp' as const : 'wta' as const,
    year: 2000 + index % 20,
  }));
  const browser = compileMatchBrowser(matches);
  const fullBytes = Buffer.byteLength(JSON.stringify(matches));
  const navigationBytes = Buffer.byteLength(JSON.stringify(browser));
  assert.ok(navigationBytes < fullBytes / 2, `${navigationBytes} compact bytes should stay below half of ${fullBytes} detail bytes`);
  assert.equal(browser.partitions.reduce((sum, partition) => sum + partition.count, 0), matches.length);
});

test('detail partitions must match the exact compact IDs, not only the count', () => {
  const matches=[fixture('partition-a','atp',2026,'2026-01-01'),fixture('partition-b','atp',2026,'2026-01-02')];
  const partition=compileMatchBrowser(matches).partitions[0];
  assert.equal(browserPartitionMatchesDetails(partition,matches),true);
  assert.equal(browserPartitionMatchesDetails(partition,[matches[0],{...matches[1],match_id:'wrong-same-count'}]),false);
});

test('compact rows preserve the public match summary contract and precomputed highlight', () => {
  const match = fixture('rich-summary', 'wta', 2026, '2026-11-02', {
    data_source: 'api',
    coverage: 'Puntos documentados',
    quality: { result: 'consistent', reason: 'verified', tapeIssue: 'late start', tape: 'partial' },
    context: {
      date: '2026-11-02', dateLabel: 'Fecha del partido', format: 'BO3', indoor: true,
      age1: 28, age2: 25, rank1: 1, rank2: 2, rankLabel: 'Ranking al jugar', minutes: 143,
      endDate: '2026-11-03', resultSource: 'https://example.test/result',
      metadataSources: [{ field: 'resultado', url: 'https://example.test/evidence' }],
    },
    winner: 1,
    final_score: '4–6 6–3 6–2',
    score_summary: {
      sets: [2, 1], games: [[4, 6], [6, 3], [6, 2]], points: ['40–30', '0–0'], server: 1,
      is_tiebreak: true, win_probability_p1: 0.61, timestamp: '2026-11-02T12:00:00Z',
    },
  });
  const browser = compileMatchBrowser([match]);
  const decoded = decodeMatchBrowserRow(browser.partitions[0], browser.partitions[0].rows[0]);
  const { listingCapabilities, ...summary } = decoded;
  assert.deepEqual(listingCapabilities, { statistics: false, points: false });
  assert.deepEqual(summary, { ...proofSummary(match), editorial_highlight: sentence(match) });
});

test('match browser query merges circuits chronologically and decodes only visible groups', () => {
  const matches = [fixture('atp', 'atp', 2026, '2026-10-02'), fixture('wta', 'wta', 2026, '2026-11-02'), fixture('old', 'atp', 2016, '2016-07-10')];
  const browser = compileMatchBrowser(matches);
  const result = queryMatchBrowser(browser.partitions, {}, 1, 1);
  assert.equal(result.total, 3);
  assert.deepEqual(result.matchDates, ['2026-11-02', '2026-10-02', '2016-07-10']);
  assert.deepEqual(result.dailyMatches.map(match => match.match_id), ['wta']);
  assert.deepEqual(result.editionYears, [2026, 2016]);
  assert.equal(result.editions.reduce((sum, edition) => sum + edition.totalMatches, 0), 2);
});

test('match browser keeps same-name ATP and WTA editions separate', () => {
  const browser = compileMatchBrowser([
    fixture('atp-wimbledon', 'atp', 2026, '2026-07-12'),
    fixture('wta-wimbledon', 'wta', 2026, '2026-07-11', { tournament: 'Wimbledon' }),
  ]);
  const result = queryMatchBrowser(browser.partitions, {}, 2, 1);
  assert.equal(result.editions.length, 2);
  assert.deepEqual(result.editions.map(edition => edition.matches[0].tour).sort(), ['atp', 'wta']);
  assert.deepEqual(result.editions.map(edition => edition.totalMatches), [1, 1]);
});

test('match browser player suggestions merge spelling variants only inside their circuit', () => {
  const browser=compileMatchBrowser([
    fixture('wta-variant-a','wta',2024,'2024-01-01',{player1:{name:'Su-Wei Hsieh',seed:null},player2:{name:'Karolína Plíšková',seed:null}}),
    fixture('wta-variant-b','wta',2025,'2025-01-01',{player1:{name:'Su Wei Hsieh',seed:null},player2:{name:'Karolina Pliskova',seed:null}}),
    fixture('atp-same-slugs','atp',2025,'2025-01-02',{player1:{name:'Su Wei Hsieh',seed:null},player2:{name:'Karolina Pliskova',seed:null}}),
  ]);
  assert.deepEqual(browser.index.circuits.wta.players,[
    {name:'Karolína Plíšková',played:2,search:'karolina pliskova'},
    {name:'Su-Wei Hsieh',played:2,search:'su wei hsieh'},
  ]);
  assert.deepEqual(browser.index.circuits.atp.players,[
    {name:'Karolina Pliskova',played:1,search:'karolina pliskova'},
    {name:'Su Wei Hsieh',played:1,search:'su wei hsieh'},
  ]);
});

test('match browser publishes canonical search dictionaries at build time',()=>{
  const browser=compileMatchBrowser([fixture('indexed','wta',2026,'2026-11-02')]);
  const partition=browser.partitions[0];
  assert.equal(partition.search!.players[partition.dictionaries.players.indexOf('Aryna Sabalenka')],'aryna sabalenka');
  assert.match(browser.index.circuits.wta.events[0].search!,/abierto de estados unidos/);
});

test('match browser applies semantic search and stable offset pagination', () => {
  const matches = [fixture('new', 'wta', 2026, '2026-11-02'), fixture('middle', 'wta', 2026, '2026-10-02'), fixture('old', 'wta', 2025, '2025-09-01')];
  const browser = compileMatchBrowser(matches);
  const filtered = queryMatchBrowserPage(browser.partitions, { q: 'Sabalenka US Open finales pista dura' }, 2, 1);
  assert.equal(filtered.total, 3);
  assert.deepEqual(filtered.matches.map(match => match.match_id), ['middle']);
  assert.equal(queryMatchBrowserPage(browser.partitions, { q: 'Sabalenkaa' }, 1, 10).total, 3);
});

test('match browser preserves public round aliases', () => {
  const browser = compileMatchBrowser([
    fixture('quarterfinal', 'atp', 2026, '2026-10-02', { round: 'Quarterfinal' }),
    fixture('semifinal', 'atp', 2026, '2026-10-03', { round: 'Semifinal' }),
  ]);
  assert.deepEqual(queryMatchBrowserPage(browser.partitions, { round: 'qf' }, 1, 10).matches.map(match => match.match_id), ['quarterfinal']);
  assert.deepEqual(queryMatchBrowserPage(browser.partitions, { round: 'sf' }, 1, 10).matches.map(match => match.match_id), ['semifinal']);
});

test('dictionary search matches terms across fields and keeps dictionary indexes local to each partition', () => {
  const browser = compileMatchBrowser([
    fixture('atp-old', 'atp', 2016, '2016-10-01', { player1: { name: 'Rafael Nadal', seed: null } }),
    fixture('atp-new', 'atp', 2026, '2026-10-01', { player1: { name: 'Novak Djokovic', seed: null } }),
    fixture('wta-new', 'wta', 2026, '2026-10-01'),
  ]);
  assert.deepEqual(queryMatchBrowserPage(browser.partitions, { q: 'Nadal Wimbledon' }, 1, 10).matches.map(match => match.match_id), ['atp-old']);
  assert.deepEqual(queryMatchBrowserPage(browser.partitions, { q: 'Sabalenka US Open' }, 1, 10).matches.map(match => match.match_id), ['wta-new']);
  assert.equal(queryMatchBrowserPage(browser.partitions, { q: 'Nadal 2026' }, 1, 10).total, 0);
  assert.deepEqual(queryMatchBrowserPage(browser.partitions, { q: 'Djokovc' }, 1, 10).matches.map(match => match.match_id), ['atp-new']);
});
