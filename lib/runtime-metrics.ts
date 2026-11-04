type Histogram = { count: number; sum: number; buckets: number[] };
const durationBuckets = [5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000] as const;
const requests = new Map<string, number>();
const durations = new Map<string, Histogram>();

const label = (value: string) => value.replace(/[^a-zA-Z0-9_./-]/g, '_').slice(0, 80);
const escape = (value: string) => value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');

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

export function resetRuntimeMetrics() { requests.clear(); durations.clear(); }
