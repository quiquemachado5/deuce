import test from 'node:test';
import assert from 'node:assert/strict';
import { recordEraEvidenceUrl, recordEraPlayerUrl, recordsUrl, recordFilters } from '../lib/records-url';
import { evidenceHref } from '../lib/record-evidence';

test('record URLs omit defaults and reset pages without dropping filters', () => {
  assert.equal(recordsUrl({ era: 'all', page: '1' }), '/records');
  const url = recordsUrl({ dato: 'top-10', era: 'last20', page: '3', smallPage: '2' }, { surface: 'clay', page: undefined, smallPage: undefined });
  assert.equal(url, '/records?dato=top-10&era=last20&surface=clay');
});

test('catalogue navigation keeps selection but removes detail-only parameters', () => {
  assert.deepEqual(recordFilters({ dato: 'top-10', era: 'last20', year: '2024', surface: 'clay', tour: 'wta', sort: 'name' }), { era: 'last20', year: '2024', surface: 'clay', competition: undefined, tour: 'wta' });
});

test('evidence links keep the era used to calculate the record', () => {
  const url = evidenceHref('top-10', { name: 'Carlos Alcaraz', href: '/players/carlos-alcaraz', detail: '', value: 10, sample: 20 }, { era: 'last20', surface: 'clay' });
  const params = new URL(url, 'https://example.com').searchParams;
  assert.equal(params.get('era'), 'last20');
  assert.equal(params.get('surface'), 'clay');
});

test('two-era records retain WTA in player and evidence links', () => {
  assert.equal(recordEraPlayerUrl('aryna-sabalenka', { tour: 'wta' }), '/jugadores/aryna-sabalenka?tour=wta');
  const url = new URL(recordEraEvidenceUrl('Aryna Sabalenka', 2020, { tour: 'wta', surface: 'hard' }), 'https://example.com');
  assert.equal(url.searchParams.get('dato'), 'dos-epocas');
  assert.equal(url.searchParams.get('tour'), 'wta');
  assert.equal(url.searchParams.get('surface'), 'hard');
});
