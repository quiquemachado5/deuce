import { createHash } from 'node:crypto';
import { observeApiRequest } from './runtime-metrics';

type VersionedJsonOptions = {
  version: string;
  scope: string;
  route: string;
  started: number;
  cacheControl?: string;
  headers?: HeadersInit;
  representation?: string;
};
export const JSON_REPRESENTATION_VERSION='2026-11-v3';

/** Mutable dataset URLs must not outlive a publication by hours or days. Browsers
 * revalidate with the versioned ETag; a shared cache gets at most five minutes. */
export const DATASET_CACHE_CONTROL = 'public, max-age=0, s-maxage=300, stale-while-revalidate=300';
export function boundedDatasetCacheControl(requested = DATASET_CACHE_CONTROL) {
  if (/(?:^|,)\s*(?:private|no-store|no-cache)(?:\s|,|$)/i.test(requested)) return requested;
  const directive = (name: string, fallback: number) => {
    const value = new RegExp('(?:^|,)\\s*' + name + '=(\\d+)(?:\\s|,|$)', 'i').exec(requested);
    return value ? Math.min(300, Number(value[1])) : fallback;
  };
  return `public, max-age=0, s-maxage=${directive('s-maxage', 300)}, stale-while-revalidate=${directive('stale-while-revalidate', 300)}`;
}


export function datasetEtag(version: string, scope: string, representation=JSON_REPRESENTATION_VERSION) {
  const digest = createHash('sha256').update(JSON.stringify([representation,scope])).digest('base64url').slice(0, 16);
  return `"deuce-${version}-${digest}"`;
}

export function requestCacheScope(request: Request, route: string) {
  const parameters = [...new URL(request.url).searchParams.entries()].sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv));
  return `${route}?${new URLSearchParams(parameters).toString()}`;
}

function matchesEtag(header: string | null, etag: string) {
  if (!header) return false;
  return header.split(',').some(value => {
    const candidate = value.trim();
    return candidate === '*' || candidate === etag || candidate.replace(/^W\//, '') === etag;
  });
}

export function versionedJson(request: Request, payload: unknown, options: VersionedJsonOptions) {
  const etag = datasetEtag(options.version, options.scope,options.representation);
  const headers = new Headers(options.headers);
  headers.set('ETag', etag);
  headers.set('Cache-Control', boundedDatasetCacheControl(options.cacheControl));
  headers.set('X-DEUCE-Dataset-Version', options.version);
  const notModified = matchesEtag(request.headers.get('if-none-match'), etag);
  const status = notModified ? 304 : 200;
  observeApiRequest(options.route, status, performance.now() - options.started);
  return notModified ? new Response(null, { status, headers }) : Response.json(payload, { headers });
}
