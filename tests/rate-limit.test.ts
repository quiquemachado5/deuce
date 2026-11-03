import assert from 'node:assert/strict';
import test from 'node:test';
import { rateLimit, rateLimitDiagnostics, resetRateLimitState } from '../lib/rate-limit';

test('rate limiter enforces a per-client window and trusts the proxy address', () => {
  resetRateLimitState();
  const request = new Request('https://deuce.test/api/search', { headers: {
    'x-real-ip': '203.0.113.8',
    'x-forwarded-for': '198.51.100.2',
  } });
  assert.equal(rateLimit(request, 'search', 2, 60_000).allowed, true);
  assert.equal(rateLimit(request, 'search', 2, 60_000).remaining, 0);
  assert.equal(rateLimit(request, 'search', 2, 60_000).allowed, false);

  const differentProxyAddress = new Request('https://deuce.test/api/search', { headers: {
    'x-real-ip': '203.0.113.9',
    'x-forwarded-for': '198.51.100.2',
  } });
  assert.equal(rateLimit(differentProxyAddress, 'search', 2, 60_000).allowed, true);
});

test('rate limiter cannot grow beyond its fixed memory budget', () => {
  resetRateLimitState();
  for (let index = 0; index < 2_200; index++) {
    rateLimit(new Request('https://deuce.test/api/search', { headers: { 'x-real-ip': `198.51.${Math.floor(index / 256)}.${index % 256}` } }), 'search', 1, 60_000);
  }
  const diagnostics = rateLimitDiagnostics();
  assert.equal(diagnostics.capacity, 2_048);
  assert.equal(diagnostics.entries, diagnostics.capacity);
  assert.equal(diagnostics.evictions, 152);
});
