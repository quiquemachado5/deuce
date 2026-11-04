type Histogram = { count: number; sum: number; buckets: number[] };
const durationBuckets = [5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000] as const;
const requests = new Map<string, number>();
const durations = new Map<string, Histogram>();
const clientEvents = new Map<string, number>();
const clientMetrics = new Map<string, Histogram>();
const clientMetricBuckets: Record<string, readonly number[]> = {
  TTFB: [200, 500, 800, 1_800, 3_000],
  FCP: [1_000, 1_800, 3_000, 5_000, 8_000],
  LCP: [1_000, 2_500, 4_000, 8_000, 12_000],
  INP: [100, 200, 500, 1_000, 2_000],
  CLS: [0.05, 0.1, 0.25, 0.5, 1],
  navigation: [500, 1_000, 2_500, 5_000, 10_000, 30_000],
  skeleton: [500, 1_000, 2_500, 5_000, 10_000, 30_000],
};
const publicTelemetryRoutes = new Set(['buscar', 'cobertura', 'comparar', 'historias', 'info', 'jugadores', 'licencias', 'records', 'sobre', 'torneos']);

const label = (value: string) => value.replace(/[^a-zA-Z0-9_./-]/g, '_').slice(0, 80);
const escape = (value: string) => value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');

/** Keep browser telemetry useful without creating a label for every entity URL. */
export function telemetryRoute(rawPath: string) {
  const parts = rawPath.split('?')[0].split('/').filter(Boolean);
  if (!parts.length) return '/';
  if (parts[0] === 'match') return '/match/:id';
  if ((parts[0] === 'jugadores' || parts[0] === 'players') && parts[1]) return '/jugadores/:slug';
  if (parts[0] === 'torneos' && parts[1] && /^\d{4}$/.test(parts[2] || '')) return '/torneos/:slug/:year';
  if (parts[0] === 'torneos' && parts[1]) return '/torneos/:slug';
  if (parts[0] === 'records' && parts[1]) return '/records/:view';
  return publicTelemetryRoutes.has(parts[0]) ? `/${parts[0]}` : '/other';
}

export function observeClientTelemetry(input: {kind:string;name?:string;value?:number;rating?:string;path?:string;navigationType?:string}) {
  const route = telemetryRoute(input.path || '/');
  const rating = ['good', 'needs-improvement', 'poor'].includes(input.rating || '') ? input.rating! : 'unrated';
  const event = label(input.kind);
  const eventKey = `${route}|${event}|${rating}`;
  clientEvents.set(eventKey, (clientEvents.get(eventKey) || 0) + 1);
  if (!Number.isFinite(input.value)) return;
  const metric = input.kind === 'web-vital' && input.name && clientMetricBuckets[input.name]
    ? input.name
    : input.kind === 'navigation' && input.navigationType === 'skeleton'
      ? 'skeleton'
      : input.kind === 'navigation' ? 'navigation' : null;
  if (!metric) return;
  const buckets = clientMetricBuckets[metric];
  const maximum = metric === 'CLS' ? 10 : 300_000;
  const value = Math.min(maximum, Math.max(0, input.value!));
  const key = `${route}|${metric}`;
  const histogram = clientMetrics.get(key) || { count: 0, sum: 0, buckets: buckets.map(() => 0) };
  histogram.count++;
  histogram.sum += value;
  buckets.forEach((upper, index) => { if (value <= upper) histogram.buckets[index]++; });
  clientMetrics.set(key, histogram);
}

/** Route names are fixed call-site labels; query strings and IDs must never be passed here. */
export function observeApiRequest(route: string, status: number, durationMs: number) {
  const safeRoute = label(route), statusClass = `${Math.floor(status / 100)}xx`;
  const counterKey = `${safeRoute}|${statusClass}`;
  requests.set(counterKey, (requests.get(counterKey) || 0) + 1);
  const histogram = durations.get(safeRoute) || { count: 0, sum: 0, buckets: durationBuckets.map(() => 0) };
  histogram.count++;
  histogram.sum += Math.max(0, durationMs);
  durationBuckets.forEach((upper, index) => { if (durationMs <= upper) histogram.buckets[index]++; });
  durations.set(safeRoute, histogram);
}

export type OperationalMetrics={
  providerRemaining?:number;providerReserve?:number;providerSafeAvailable?:number;
  providerDailyCallCap?:number;providerDailyCapAvailable?:number;providerDailyCapUtilization?:number;
  publicationPeakRssBytes?:number;storageBytes?:number;storageObjects?:number;
  incompleteEditions?:number;enrichmentRemaining?:number;enrichmentDeferred?:number;
  backupAgeSeconds?:number;hostAvailableMemoryBytes?:number;
};

export function renderPrometheusMetrics(caches: Record<string, Record<string, number>> = {},operational:OperationalMetrics={}) {
  const lines = [
    '# HELP deuce_http_requests_total HTTP requests served by selected data routes.',
    '# TYPE deuce_http_requests_total counter',
  ];
  for (const [key, value] of [...requests].sort(([a], [b]) => a.localeCompare(b))) {
    const [route, statusClass] = key.split('|');
    lines.push(`deuce_http_requests_total{route="${escape(route)}",status_class="${statusClass}"} ${value}`);
  }
  lines.push('# HELP deuce_http_request_duration_ms Request duration in milliseconds.', '# TYPE deuce_http_request_duration_ms histogram');
  for (const [route, histogram] of [...durations].sort(([a], [b]) => a.localeCompare(b))) {
    durationBuckets.forEach((upper, index) => lines.push(`deuce_http_request_duration_ms_bucket{route="${escape(route)}",le="${upper}"} ${histogram.buckets[index]}`));
    lines.push(`deuce_http_request_duration_ms_bucket{route="${escape(route)}",le="+Inf"} ${histogram.count}`);
    lines.push(`deuce_http_request_duration_ms_sum{route="${escape(route)}"} ${histogram.sum.toFixed(3)}`);
    lines.push(`deuce_http_request_duration_ms_count{route="${escape(route)}"} ${histogram.count}`);
  }
  lines.push('# HELP deuce_client_events_total Browser events received by route family and rating.', '# TYPE deuce_client_events_total counter');
  for (const [key, value] of [...clientEvents].sort(([a], [b]) => a.localeCompare(b))) {
    const [route,event,rating] = key.split('|');
    lines.push(`deuce_client_events_total{route="${escape(route)}",event="${escape(event)}",rating="${escape(rating)}"} ${value}`);
  }
  lines.push('# HELP deuce_client_metric_value Browser performance values; milliseconds except CLS.', '# TYPE deuce_client_metric_value histogram');
  for (const [key, histogram] of [...clientMetrics].sort(([a], [b]) => a.localeCompare(b))) {
    const [route,metric] = key.split('|');
    clientMetricBuckets[metric].forEach((upper,index)=>lines.push(`deuce_client_metric_value_bucket{route="${escape(route)}",metric="${metric}",le="${upper}"} ${histogram.buckets[index]}`));
    lines.push(`deuce_client_metric_value_bucket{route="${escape(route)}",metric="${metric}",le="+Inf"} ${histogram.count}`);
    lines.push(`deuce_client_metric_value_sum{route="${escape(route)}",metric="${metric}"} ${histogram.sum.toFixed(3)}`);
    lines.push(`deuce_client_metric_value_count{route="${escape(route)}",metric="${metric}"} ${histogram.count}`);
  }
  lines.push('# HELP deuce_process_memory_bytes Node.js process memory.', '# TYPE deuce_process_memory_bytes gauge');
  const memory = process.memoryUsage();
  for (const [kind, value] of Object.entries({ rss: memory.rss, heap_used: memory.heapUsed, heap_total: memory.heapTotal, external: memory.external })) lines.push(`deuce_process_memory_bytes{kind="${kind}"} ${value}`);
  lines.push('# HELP deuce_cache_entries Process-local cache entries.', '# TYPE deuce_cache_entries gauge', '# HELP deuce_cache_weight Estimated cache memory weight.', '# TYPE deuce_cache_weight gauge');
  for (const [name, stats] of Object.entries(caches).sort(([a], [b]) => a.localeCompare(b))) {
    const cache = escape(label(name));
    lines.push(`deuce_cache_entries{cache="${cache}"} ${stats.entries || 0}`);
    lines.push(`deuce_cache_weight{cache="${cache}"} ${stats.weight || 0}`);
    for (const counter of ['hits', 'misses', 'evictions', 'failures'] as const) lines.push(`deuce_cache_${counter}_total{cache="${cache}"} ${stats[counter] || 0}`);
  }
  lines.push('# HELP deuce_operational_value Current durable operational gauges.','# TYPE deuce_operational_value gauge');
  for(const [name,value] of Object.entries(operational).sort(([a],[b])=>a.localeCompare(b))){
    if(Number.isFinite(value))lines.push(`deuce_operational_value{name="${escape(label(name))}"} ${value}`);
  }
  return `${lines.join('\n')}\n`;
}

export function resetRuntimeMetrics() { requests.clear(); durations.clear(); clientEvents.clear(); clientMetrics.clear(); }
