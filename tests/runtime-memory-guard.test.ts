import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { shouldCacheBundledArtifact } from '../lib/revista/read-records';

test('large bundled artifacts have one bounded cache owner', () => {
  for (const id of ['matches-atp-2020s','browser-matches-wta-1990s','players','competition','audit','reconciliation']) {
    assert.equal(shouldCacheBundledArtifact(id),false,id);
  }
  assert.equal(shouldCacheBundledArtifact('manifest'),true);
  assert.equal(shouldCacheBundledArtifact('piece-victorias'),true);
});

test('deep health reads partition metadata without inflating every match partition', async () => {
  const source=await readFile(new URL('../app/api/health/deep/route.ts',import.meta.url),'utf8');
  assert.match(source,/preparedMatchBrowserIndex\(\)/);
  assert.match(source,/healthIssues/);
  assert.doesNotMatch(source,/preparedMatchBrowser\('all'\)/);
});

test('annual match sitemaps decode only compact summaries for their decade', async () => {
  const source=await readFile(new URL('../app/match/sitemap/[year]/route.ts',import.meta.url),'utf8');
  assert.match(source,/preparedMatchSitemapArchive\(year\)/);
  assert.doesNotMatch(source,/generation\.matches\(\)/);
});

test('publication compares a compact ledger instead of inflating the previous archive',async()=>{
  const source=await readFile(new URL('../app/api/cron/publish/route.ts',import.meta.url),'utf8');
  assert.match(source,/preparedPublicationIndex\(\)/);
  assert.doesNotMatch(source,/baseline\.matches\(\)/);
  assert.match(source,/input\.length=0/);
});
