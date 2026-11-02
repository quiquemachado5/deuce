import assert from 'node:assert/strict';
import test from 'node:test';
import { isProviderFreeHistoryLimit, providerHasRequestAfterUsage, providerQuotaRetryAt, providerRemainingCalls } from '../lib/provider-quota';

test('exhausted daily quota is deferred to the provider reset', () => {
  const quota = { today: { remaining_day: 0, reset_at: '2026-11-03T00:00:00.000Z' } };
  assert.equal(providerRemainingCalls(quota), 0);
  assert.equal(providerQuotaRetryAt(quota, Date.parse('2026-11-02T18:00:00.000Z')), '2026-11-03T00:00:00.000Z');
});

test('missing reset metadata uses the next UTC quota day', () => {
  assert.equal(providerQuotaRetryAt({ today: { remaining_day: 0 } }, Date.parse('2026-11-02T18:00:00.000Z')), '2026-11-03T00:05:00.000Z');
  assert.equal(providerRemainingCalls({today:{remaining_day:null}}),Number.POSITIVE_INFINITY);
});

test('the usage probe leaves at least one provider request available', () => {
  assert.equal(providerHasRequestAfterUsage({today:{remaining_day:0}}), false);
  assert.equal(providerHasRequestAfterUsage({today:{remaining_day:1}}), false);
  assert.equal(providerHasRequestAfterUsage({today:{remaining_day:2}}), true);
  assert.equal(providerHasRequestAfterUsage({today:{remaining_day:null}}), true);
});

test('only the documented 403 history allowance is deferred', () => {
  assert.equal(isProviderFreeHistoryLimit(403, { detail: 'Upgrade your history plan to continue' }), true);
  assert.equal(isProviderFreeHistoryLimit(403, { message: 'No free history calls remaining' }), true);
  assert.equal(isProviderFreeHistoryLimit(403, { detail: 'Invalid API key' }), false);
  assert.equal(isProviderFreeHistoryLimit(429, { detail: 'No free history calls remaining' }), false);
});
