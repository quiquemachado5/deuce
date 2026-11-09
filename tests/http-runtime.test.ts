import assert from 'node:assert/strict';
import test from 'node:test';
import { datasetEtag, requestCacheScope, versionedJson } from '../lib/http-cache';
import { observeApiRequest, observeClientTelemetry, observeSecurityEvent, renderPrometheusMetrics, resetRuntimeMetrics, telemetryRoute } from '../lib/runtime-metrics';
import { GET as metricsRoute } from '../app/api/metrics/route';
import { POST as telemetryEndpoint } from '../app/api/telemetry/route';

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

test('Prometheus metrics persist bounded security outcomes without request data',()=>{
  resetRuntimeMetrics();
  observeSecurityEvent('cron.publish','denied');
  const output=renderPrometheusMetrics();
  assert.match(output,/deuce_security_events_total\{surface="cron.publish",outcome="denied"\} 1/);
  assert.doesNotMatch(output,/token|authorization|203\.0\.113/iu);
});

test('browser telemetry is aggregated into bounded route families',()=>{
  resetRuntimeMetrics();
  assert.equal(telemetryRoute('/match/live-123?junto=live-456'),'/match/:id');
  assert.equal(telemetryRoute('/torneos/wimbledon/2026'),'/torneos/:slug/:year');
  assert.equal(telemetryRoute('/jugadores/novak-djokovic'),'/jugadores/:slug');
  assert.equal(telemetryRoute('/partidos'),'/partidos');
  assert.equal(telemetryRoute('/en/matches/live-123'),'/en/matches/:id');
  assert.equal(telemetryRoute('/en/tournaments/wimbledon/2024'),'/en/tournaments/:slug/:year');
  assert.equal(telemetryRoute('/en/players/serena-williams'),'/en/players/:slug');
  assert.equal(telemetryRoute('/en/unknown/place'),'/en/other');
  assert.equal(telemetryRoute('/invented/entity/123'),'/other');
  observeClientTelemetry({kind:'web-vital',name:'LCP',value:3100,rating:'needs-improvement',path:'/match/live-123'});
  observeClientTelemetry({kind:'navigation',navigationType:'skeleton',value:5200,path:'/torneos/wimbledon/2026'});
  observeClientTelemetry({kind:'navigation',navigationType:'route-transition',value:820,path:'/partidos'});
  observeClientTelemetry({kind:'navigation',value:1e308,path:'/invented/entity/123'});
  const output=renderPrometheusMetrics();
  assert.match(output,/deuce_client_events_total\{route="\/match\/:id",event="web-vital",rating="needs-improvement"\} 1/);
  assert.match(output,/deuce_client_metric_value_count\{route="\/match\/:id",metric="LCP"\} 1/);
  assert.match(output,/deuce_client_metric_value_count\{route="\/torneos\/:slug\/:year",metric="skeleton"\} 1/);
  assert.match(output,/deuce_client_metric_value_count\{route="\/partidos",metric="route-transition"\} 1/);
  assert.match(output,/deuce_client_metric_value_sum\{route="\/other",metric="navigation"\} 300000\.000/);
  assert.doesNotMatch(output,/live-123|live-456/);
  assert.doesNotMatch(output,/Infinity|1e\+308/);
});

test('telemetry rejects malformed measurements before aggregation',async()=>{
  const invalid=await telemetryEndpoint(new Request('https://deuce.test/api/telemetry',{
    method:'POST',headers:{'content-type':'application/json'},body:'{"kind":"navigation","value":1e999,"path":"/"}',
  }));
  assert.equal(invalid.status,400);
  const missingMetric=await telemetryEndpoint(new Request('https://deuce.test/api/telemetry',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:'web-vital',value:1200,path:'/'}),
  }));
  assert.equal(missingMetric.status,400);
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
