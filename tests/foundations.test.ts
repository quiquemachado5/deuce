import test from 'node:test';
import assert from 'node:assert/strict';
import { createLimiter } from '../lib/concurrency';
import { isDemoDataEnabled } from '../lib/data-config';
import { normalizeSurface, SURFACES } from '../lib/surface';
import { summarizeDataset, assertPublishableArchive } from '../lib/dataset-summary';
import { mockMatches } from '../lib/mocks';
import { playerDirectory } from '../lib/explore';
import { buildSeasonAnalytics } from '../lib/season-analytics';
import { approximateName, canonicalSearchText, searchText, withinOneEdit } from '../lib/search-text';
import { compileRecordSnapshot } from '../lib/revista/snapshot';
import { parseRepositoryQuery } from '../lib/repository-query';
import type { Match } from '../lib/types';
import { recordCatalog } from '../lib/revista/records';
import { prepareMatch } from '../lib/quality';
import { preservePublishedArchive } from '../lib/revista/release-source';

test('demo is opt-in and cannot run in production or Vercel previews', () => {
  assert.equal(isDemoDataEnabled({}), false);
  assert.equal(isDemoDataEnabled({ NEXT_PUBLIC_USE_MOCK_DATA: 'false' }), false);
  assert.equal(isDemoDataEnabled({ NODE_ENV: 'development', NEXT_PUBLIC_USE_MOCK_DATA: 'true' }), true);
  assert.throws(() => isDemoDataEnabled({ NODE_ENV: 'production', NEXT_PUBLIC_USE_MOCK_DATA: 'true' }));
  assert.throws(() => isDemoDataEnabled({ VERCEL_ENV: 'preview', NEXT_PUBLIC_USE_MOCK_DATA: 'true' }));
  assert.throws(() => isDemoDataEnabled({ NEXT_PUBLIC_USE_MOCK_DATA: 'yes' }));
});

test('surface normalization never invents hard court', () => {
  for (const surface of SURFACES) assert.equal(normalizeSurface(surface), surface);
  assert.equal(normalizeSurface(' CARPET '), 'carpet');
  for (const missing of [null, undefined, '', 'synthetic', 1]) assert.equal(normalizeSurface(missing), 'unknown');
  assert.equal(prepareMatch({ ...mockMatches[0], surface: null } as unknown as Match).surface, 'unknown');
});

test('limiter caps simultaneous operations and releases a failed slot', async () => {
  const limit = createLimiter(4);
  let active = 0, peak = 0;
  const results = await Promise.allSettled(Array.from({ length: 80 }, (_, i) => limit(async () => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 1));
    active--;
    if (i === 10) throw new Error('expected test failure');
    return i;
  })));
  assert.equal(peak, 4);
  assert.equal(active, 0);
  assert.equal(results.filter(result => result.status === 'rejected').length, 1);
  assert.equal(await limit(async () => 'healthy'), 'healthy');
  assert.throws(() => createLimiter(0));
});

test('new surfaces are counted by both player aggregation paths', () => {
  const matches = SURFACES.map((surface, i) => ({ ...mockMatches[0], match_id: `surface-${i}`, surface }));
  const players = playerDirectory(matches), analytics = buildSeasonAnalytics(matches).players;
  for (const player of players) for (const surface of SURFACES) assert.equal(player.bySurface[surface].played, 1);
  for (const player of analytics) for (const surface of SURFACES) assert.equal(player.surfaces[surface].played, 1);
  assert.deepEqual(summarizeDataset(matches).surfaces, { hard: 1, clay: 1, grass: 1, carpet: 1, unknown: 1 });
});

test('coverage distinguishes missing ranking and partial enrichment', () => {
  const match: Match = { ...mockMatches[0], point_tape: [], statistics: [], context: { rankLabel: 'Ranking en la descarga', rank1: 1 } };
  const summary = summarizeDataset([match]);
  assert.equal(summary.years[0].ranking, 0);
  assert.equal(summary.years[0].points, 0);
  assert.equal(summary.years[0].statistics, 0);
  assert.equal(summarizeDataset([{ ...match, context: { rankLabel: 'Ranking al jugar', rank1: 1 } }]).years[0].ranking, 1);
});

test('publication blocks bad archives and restores a newer immutable baseline', async () => {
  assert.throws(() => assertPublishableArchive(mockMatches), /demo/);
  assert.throws(() => assertPublishableArchive([]), /small/);
  const matches = Array.from({ length: 100_000 }, (_, i) => ({ ...mockMatches[0], data_source: 'api' as const, match_id: `test-${i}`, year: i ? 2026 : 1968 }));
  assert.doesNotThrow(() => assertPublishableArchive(matches, 100_000, 2026));
  assert.throws(() => assertPublishableArchive(matches, 120_000, 2026), /10%/);
  const restored = await preservePublishedArchive(matches.slice(0, -1), { matchCount: matches.length, version: 'published-v1' }, async () => matches);
  assert.equal(restored, matches);
  await assert.rejects(() => preservePublishedArchive(matches.slice(0, -1), { matchCount: matches.length, version: 'published-v1' }, async () => matches.slice(0, -1)), /restore/);
  matches[1] = { ...matches[1], match_id: 'test-0' };
  assert.throws(() => assertPublishableArchive(matches, 100_000, 2026), /duplicate/);
});

test('search suggestions tolerate a single typo but not unrelated names', () => {
  assert.equal(searchText('Félix Auger–Aliassime'), 'felix auger aliassime');
  assert.equal(approximateName('Djokovich', 'Novak Djokovic'), true);
  assert.equal(approximateName('Federar', 'Roger Federer'), true);
  assert.equal(approximateName('Novak Djokovic', 'Novak Djokovic'), true);
  assert.equal(approximateName('Nadal', 'Novak Djokovic'), false);
  assert.equal(withinOneEdit('abc', 'abd'), false);
  assert.equal(canonicalSearchText('Australian Open quarterfinal'), 'abierto de australia cuartos de final');
  assert.equal(canonicalSearchText('Lyon, Francia'), 'lyon france');
});

test('API accepts moqueta/unknown and still rejects invalid values', () => {
  for (const surface of SURFACES) assert.equal(parseRepositoryQuery(new URLSearchParams({ surface })).surface, surface);
  assert.throws(() => parseRepositoryQuery(new URLSearchParams({ surface: 'lava' })));
});

test('snapshot identity is reproducible and includes the editorial day', () => {
  const first = compileRecordSnapshot(mockMatches, new Date('2026-10-21T08:00:00Z'));
  assert.equal(first.manifest.version, compileRecordSnapshot(mockMatches, new Date('2026-10-21T09:00:00Z')).manifest.version);
  assert.notEqual(first.manifest.version, compileRecordSnapshot(mockMatches, new Date('2026-10-22T08:00:00Z')).manifest.version);
  assert.equal(first.manifest.mode, 'DEMO');
  assert.equal(first.manifest.summary.years.reduce((sum, row) => sum + row.matches, 0), mockMatches.length);
});

test('anniversary content and its cache follow the requested editorial day', () => {
  const matches: Match[] = [{ ...mockMatches[0], context: { ...mockMatches[0].context, dateLabel: 'Fecha del partido', date: '2024-10-21' } }];
  const first = new Date('2026-10-21T08:00:00Z'), next = new Date('2026-10-22T08:00:00Z');
  assert.equal(recordCatalog(matches, first).find(piece => piece.id === 'tal-dia-como-hoy')?.rows.length, 1);
  assert.equal(recordCatalog(matches, next).find(piece => piece.id === 'tal-dia-como-hoy'), undefined);
  assert.equal(compileRecordSnapshot(matches, first).pieces['tal-dia-como-hoy'].pages['1'].length, 1);
  assert.equal(compileRecordSnapshot(matches, next).pieces['tal-dia-como-hoy'], undefined);
});
