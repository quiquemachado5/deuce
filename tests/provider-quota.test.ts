import assert from 'node:assert/strict';
import test from 'node:test';
import { isProviderFreeHistoryLimit, providerCallsAboveReserve, providerCallsBelowDailyCap, providerDailyCallCap, providerHasRequestAfterUsage, providerMinimumReserve, providerOperationBudget, providerOperationCallLimit, providerQuotaRetryAt, providerQuotaSnapshot, providerRemainingCalls } from '../lib/provider-quota';

test('exhausted daily quota is deferred to the provider reset', () => {
  const quota = { today: { remaining_day: 0, reset_at: '2026-11-03T00:00:00.000Z' } };
  assert.equal(providerRemainingCalls(quota), 0);
  assert.equal(providerQuotaRetryAt(quota, Date.parse('2026-11-02T18:00:00.000Z')), '2026-11-03T00:00:00.000Z');
});

test('missing reset metadata uses the next UTC quota day', () => {
  assert.equal(providerQuotaRetryAt({ today: { remaining_day: 0 } }, Date.parse('2026-11-02T18:00:00.000Z')), '2026-11-03T00:05:00.000Z');
  assert.equal(providerRemainingCalls({today:{remaining_day:null}}),Number.POSITIVE_INFINITY);
});

test('free plan shares a daily cap and preserves a safety reserve', () => {
  assert.equal(providerMinimumReserve(), 10);
  assert.equal(providerHasRequestAfterUsage({today:{remaining_day:0}}), false);
  assert.equal(providerHasRequestAfterUsage({today:{remaining_day:10}}), false);
  assert.equal(providerHasRequestAfterUsage({today:{remaining_day:11}}), true);
  assert.equal(providerHasRequestAfterUsage({today:{remaining_day:null}}), true);
  assert.equal(providerCallsAboveReserve({today:{remaining_day:47}}),37);
  assert.equal(providerOperationCallLimit({today:{remaining_day:15}},30),6);
  assert.equal(providerOperationCallLimit({today:{remaining_day:900}},30),30);
  assert.equal(providerDailyCallCap(),90);
  assert.equal(providerCallsBelowDailyCap({today:{used_day:80}}),10);
  assert.equal(providerHasRequestAfterUsage({today:{remaining_day:900,used_day:90}}),false);
  assert.equal(providerOperationCallLimit({today:{remaining_day:900,used_day:85}},30),6);
});

test('operation budgets and the persisted quota snapshot share one policy',()=>{
  const quota={today:{remaining_day:250,limit_day:1000,used_day:350,reset_at:'2026-11-04T22:00:00.000Z'}};
  assert.equal(providerOperationBudget(quota,'enrichment',90),1);
  assert.deepEqual(providerQuotaSnapshot(quota,'enrichment',90,new Date('2026-11-04T20:00:00.000Z')),{
    at:'2026-11-04T20:00:00.000Z',operation:'enrichment',remaining:250,dailyLimit:1000,used:350,
    reserve:10,safeAvailable:240,dailyCallCap:90,dailyCapAvailable:0,dailyCapUtilization:1,
    operationLimit:1,retryAt:'2026-11-04T22:00:00.000Z',
  });
});

test('only the documented 403 history allowance is deferred', () => {
  assert.equal(isProviderFreeHistoryLimit(403, { detail: 'Upgrade your history plan to continue' }), true);
  assert.equal(isProviderFreeHistoryLimit(403, { message: 'No free history calls remaining' }), true);
  assert.equal(isProviderFreeHistoryLimit(403, { detail: 'Invalid API key' }), false);
  assert.equal(isProviderFreeHistoryLimit(429, { detail: 'No free history calls remaining' }), false);
});
