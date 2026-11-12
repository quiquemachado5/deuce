type Histogram = { count: number; sum: number; buckets: number[] };
const durationBuckets = [5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000] as const;
const requests = new Map<string, number>();
const durations = new Map<string, Histogram>();
const clientEvents = new Map<string, number>();
const securityEvents = new Map<string, number>();
const clientMetrics = new Map<string, Histogram>();
const searchEvents = new Map<string, number>();
const searchClicks = new Map<string, number>();
const searchDurations = new Map<string, Histogram>();
const searchDurationBuckets = [10, 25, 50, 100, 250, 500, 1_000, 2_500] as const;
const clientMetricBuckets: Record<string, readonly number[]> = {
  TTFB: [200, 500, 800, 1_800, 3_000],
  FCP: [1_000, 1_800, 3_000, 5_000, 8_000],
  LCP: [1_000, 2_500, 4_000, 8_000, 12_000],
  INP: [100, 200, 500, 1_000, 2_000],
  CLS: [0.05, 0.1, 0.25, 0.5, 1],
  navigation: [500, 1_000, 2_500, 5_000, 10_000, 30_000],
  'route-transition': [100, 250, 500, 1_000, 2_500, 5_000, 10_000],
  skeleton: [500, 1_000, 2_500, 5_000, 10_000, 30_000],
};
const publicTelemetryRoutes = new Set(['buscar', 'cobertura', 'comparar', 'desarrolladores', 'historias', 'info', 'jugadores', 'licencias', 'maquina-del-tiempo', 'partidos', 'players', 'records', 'sobre', 'torneos']);

const label = (value: string) => value.replace(/[^a-zA-Z0-9_./-]/g, '_').slice(0, 80);
const escape = (value: string) => value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
const release = label(process.env.COMMIT_REF?.slice(0, 12) || 'local');
const devices = new Set(['mobile', 'tablet', 'desktop']);

/** Keep browser telemetry useful without creating a label for every entity URL. */
export function telemetryRoute(rawPath: string) {
  const parts = rawPath.split('?')[0].split('/').filter(Boolean);
  if (!parts.length) return '/';
  if (parts[0] === 'en') {
    if (parts.length === 1) return '/en';
    if (parts[1] === 'matches' && parts[2]) return '/en/matches/:id';
    if (parts[1] === 'players' && parts[2]) return '/en/players/:slug';
    if (parts[1] === 'tournaments' && parts[2] && /^\d{4}$/.test(parts[3] || '')) return '/en/tournaments/:slug/:year';
    if (parts[1] === 'tournaments' && parts[2]) return '/en/tournaments/:slug';
    return new Set(['matches', 'players', 'tournaments', 'records', 'compare', 'time-machine', 'coverage', 'developers']).has(parts[1])
      ? `/en/${parts[1]}`
      : '/en/other';
  }
  if (parts[0] === 'match') return '/match/:id';
  if ((parts[0] === 'jugadores' || parts[0] === 'players') && parts[1]) return '/jugadores/:slug';
  if (parts[0] === 'torneos' && parts[1] && /^\d{4}$/.test(parts[2] || '')) return '/torneos/:slug/:year';
  if (parts[0] === 'torneos' && parts[1]) return '/torneos/:slug';
  if (parts[0] === 'records' && parts[1]) return '/records/:view';
  return publicTelemetryRoutes.has(parts[0]) ? `/${parts[0]}` : '/other';
}

export function observeClientTelemetry(input: {kind:string;name?:string;value?:number;rating?:string;path?:string;navigationType?:string;device?:string}) {
  const route = telemetryRoute(input.path || '/');
  const device = devices.has(input.device || '') ? input.device! : 'unknown';
  const rating = ['good', 'needs-improvement', 'poor'].includes(input.rating || '') ? input.rating! : 'unrated';
  const event = label(input.kind);
  const eventKey = `${route}|${event}|${rating}|${device}`;
  clientEvents.set(eventKey, (clientEvents.get(eventKey) || 0) + 1);
  if (!Number.isFinite(input.value)) return;
  const metric = input.kind === 'web-vital' && input.name && clientMetricBuckets[input.name]
    ? input.name
    : input.kind === 'navigation' && input.navigationType === 'skeleton'
      ? 'skeleton'
      : input.kind === 'navigation' && input.navigationType === 'route-transition'
        ? 'route-transition'
      : input.kind === 'navigation' ? 'navigation' : null;
  if (!metric) return;
  const buckets = clientMetricBuckets[metric];
  const maximum = metric === 'CLS' ? 10 : 300_000;
  const value = Math.min(maximum, Math.max(0, input.value!));
  const key = `${route}|${metric}|${device}`;
  const histogram = clientMetrics.get(key) || { count: 0, sum: 0, buckets: buckets.map(() => 0) };
  histogram.count++;
  histogram.sum += value;
  buckets.forEach((upper, index) => { if (value <= upper) histogram.buckets[index]++; });
  clientMetrics.set(key, histogram);
}

const queryLengthBucket = (length: number) => length <= 3 ? '2-3' : length <= 7 ? '4-7' : length <= 15 ? '8-15' : '16-plus';
const resultBucket = (count: number) => count === 0 ? 'zero' : count <= 5 ? '1-5' : count <= 15 ? '6-15' : '16-plus';

/** Search telemetry keeps only fixed buckets; raw terms, names and URLs are never retained. */
export function observeSearchTelemetry(input: {mode:'quick'|'full';tour:'atp'|'wta'|'all';queryLength:number;resultCount:number;durationMs:number;outcome?:'success'|'error'}) {
  const mode = input.mode, tour = input.tour;
  const outcome = input.outcome === 'error' ? 'error' : input.resultCount === 0 ? 'zero' : 'results';
  const key = `${mode}|${tour}|${outcome}|${queryLengthBucket(Math.max(0, input.queryLength))}|${resultBucket(Math.max(0, input.resultCount))}`;
  searchEvents.set(key, (searchEvents.get(key) || 0) + 1);
  const durationKey = `${mode}|${tour}`;
  const value = Math.min(30_000, Math.max(0, input.durationMs));
  const histogram = searchDurations.get(durationKey) || { count: 0, sum: 0, buckets: searchDurationBuckets.map(() => 0) };
  histogram.count++; histogram.sum += value;
  searchDurationBuckets.forEach((upper, index) => { if (value <= upper) histogram.buckets[index]++; });
  searchDurations.set(durationKey, histogram);
}

/** Click telemetry records only fixed buckets; it cannot reconstruct a search term or destination. */
export function observeSearchClick(input:{group:'players'|'matches'|'tournaments'|'all';position:number;queryLength:number}) {
  const position = input.position <= 1 ? '1' : input.position <= 3 ? '2-3' : input.position <= 6 ? '4-6' : '7-plus';
  const key = `${input.group}|${position}|${queryLengthBucket(Math.max(0,input.queryLength))}`;
  searchClicks.set(key,(searchClicks.get(key)||0)+1);
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

/** Security surfaces are fixed call-site labels; never pass URLs, tokens or raw addresses. */
export function observeSecurityEvent(surface: string, outcome: 'denied' | 'allowed') {
  const key = `${label(surface)}|${outcome}`;
  securityEvents.set(key, (securityEvents.get(key) || 0) + 1);
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
    const [route,event,rating,device] = key.split('|');
    lines.push(`deuce_client_events_total{route="${escape(route)}",event="${escape(event)}",rating="${escape(rating)}",device="${device}",release="${release}"} ${value}`);
  }
  lines.push('# HELP deuce_security_events_total Security-sensitive outcomes by fixed surface.', '# TYPE deuce_security_events_total counter');
  for (const [key, value] of [...securityEvents].sort(([a], [b]) => a.localeCompare(b))) {
    const [surface,outcome] = key.split('|');
    lines.push(`deuce_security_events_total{surface="${escape(surface)}",outcome="${outcome}"} ${value}`);
  }
  lines.push('# HELP deuce_client_metric_value Browser performance values; milliseconds except CLS.', '# TYPE deuce_client_metric_value histogram');
  for (const [key, histogram] of [...clientMetrics].sort(([a], [b]) => a.localeCompare(b))) {
    const [route,metric,device] = key.split('|');
    clientMetricBuckets[metric].forEach((upper,index)=>lines.push(`deuce_client_metric_value_bucket{route="${escape(route)}",metric="${metric}",device="${device}",release="${release}",le="${upper}"} ${histogram.buckets[index]}`));
    lines.push(`deuce_client_metric_value_bucket{route="${escape(route)}",metric="${metric}",device="${device}",release="${release}",le="+Inf"} ${histogram.count}`);
    lines.push(`deuce_client_metric_value_sum{route="${escape(route)}",metric="${metric}",device="${device}",release="${release}"} ${histogram.sum.toFixed(3)}`);
    lines.push(`deuce_client_metric_value_count{route="${escape(route)}",metric="${metric}",device="${device}",release="${release}"} ${histogram.count}`);
  }
  lines.push('# HELP deuce_searches_total Privacy-safe search outcomes in fixed buckets.', '# TYPE deuce_searches_total counter');
  for (const [key, value] of [...searchEvents].sort(([a], [b]) => a.localeCompare(b))) {
    const [mode,tour,outcome,queryBucket,results] = key.split('|');
    lines.push(`deuce_searches_total{mode="${mode}",tour="${tour}",outcome="${outcome}",query_length="${queryBucket}",results="${results}"} ${value}`);
  }
  lines.push('# HELP deuce_search_clicks_total Privacy-safe selected-result clicks in fixed buckets.', '# TYPE deuce_search_clicks_total counter');
  for(const [key,value] of [...searchClicks].sort(([a],[b])=>a.localeCompare(b))){
    const [group,position,queryBucket]=key.split('|');
    lines.push(`deuce_search_clicks_total{group="${group}",position="${position}",query_length="${queryBucket}"} ${value}`);
  }
  lines.push('# HELP deuce_search_duration_ms Search response duration without query contents.', '# TYPE deuce_search_duration_ms histogram');
  for (const [key, histogram] of [...searchDurations].sort(([a], [b]) => a.localeCompare(b))) {
    const [mode,tour] = key.split('|');
    searchDurationBuckets.forEach((upper,index)=>lines.push(`deuce_search_duration_ms_bucket{mode="${mode}",tour="${tour}",le="${upper}"} ${histogram.buckets[index]}`));
    lines.push(`deuce_search_duration_ms_bucket{mode="${mode}",tour="${tour}",le="+Inf"} ${histogram.count}`);
    lines.push(`deuce_search_duration_ms_sum{mode="${mode}",tour="${tour}"} ${histogram.sum.toFixed(3)}`);
    lines.push(`deuce_search_duration_ms_count{mode="${mode}",tour="${tour}"} ${histogram.count}`);
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

export function resetRuntimeMetrics() { requests.clear(); durations.clear(); clientEvents.clear(); clientMetrics.clear(); securityEvents.clear(); searchEvents.clear(); searchClicks.clear(); searchDurations.clear(); }
