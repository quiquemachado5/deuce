import assert from 'node:assert/strict';
import test from 'node:test';
import { datasetEtag, requestCacheScope, versionedJson } from '../lib/http-cache';
import { observeApiRequest, renderPrometheusMetrics, resetRuntimeMetrics } from '../lib/runtime-metrics';
import { GET as metricsRoute } from '../app/api/metrics/route';

test('dataset ETags are stable across query parameter order and return 304', async () => {
  const first = new Request('https://deuce.test/api/matches?tour=wta&year=2024');
  const second = new Request('https://deuce.test/api/matches?year=2024&tour=wta');
  const scope = requestCacheScope(first, 'matches');
  assert.equal(scope, requestCacheScope(second, 'matches'));
  const etag = datasetEtag('1234567890abcdefghij', scope);
  const response = versionedJson(new Request(first.url, { headers: { 'If-None-Match': `W/${etag}` } }), { ok: true }, { version: '1234567890abcdefghij', scope, route: 'matches', started: performance.now() });
  assert.equal(response.status, 304);
  assert.equal(response.headers.get('etag'), etag);
  assert.equal(await response.text(), '');
});

test('Prometheus metrics expose bounded route and cache diagnostics', () => {
  resetRuntimeMetrics();
  observeApiRequest('search', 200, 12);
  observeApiRequest('search', 304, 3);
  const output = renderPrometheusMetrics({ browserPartitions: { entries: 2, weight: 1024, hits: 4, misses: 1, evictions: 0, failures: 0 } });
  assert.match(output, /deuce_http_requests_total\{route="search",status_class="2xx"\} 1/);
  assert.match(output, /deuce_http_requests_total\{route="search",status_class="3xx"\} 1/);
  assert.match(output, /deuce_cache_weight\{cache="browserPartitions"\} 1024/);
  assert.doesNotMatch(output, /undefined|NaN/);
});

test('Prometheus metrics expose finite durable operation gauges',()=>{
  const output=renderPrometheusMetrics({}, {providerRemaining:812,providerReserve:200,publicationPeakRssBytes:1234});
  assert.match(output,/deuce_operational_value\{name="providerRemaining"\} 812/);
  assert.doesNotMatch(output,/NaN|undefined/);
});

test('metrics endpoint requires its own bearer secret', async () => {
  const previous = process.env.METRICS_SECRET;
  process.env.METRICS_SECRET = 'metrics-secret-for-tests';
  try {
    assert.equal((await metricsRoute(new Request('https://deuce.test/api/metrics'))).status, 401);
    assert.equal((await metricsRoute(new Request('https://deuce.test/api/metrics', { headers: { Authorization: 'Bearer wrong-secret' } }))).status, 401);
    const response = await metricsRoute(new Request('https://deuce.test/api/metrics', { headers: { Authorization: 'Bearer metrics-secret-for-tests' } }));
    assert.equal(response.status, 200);
    assert.match(await response.text(), /deuce_process_memory_bytes/);
  } finally {
    if (previous === undefined) delete process.env.METRICS_SECRET;
    else process.env.METRICS_SECRET = previous;
  }
});
