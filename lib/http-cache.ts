import { createHash } from 'node:crypto';
import { observeApiRequest } from './runtime-metrics';

type VersionedJsonOptions = {
  version: string;
  scope: string;
  route: string;
  started: number;
  cacheControl?: string;
  headers?: HeadersInit;
};

export function datasetEtag(version: string, scope: string) {
  const digest = createHash('sha256').update(scope).digest('base64url').slice(0, 16);
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
  const etag = datasetEtag(options.version, options.scope);
  const headers = new Headers(options.headers);
  headers.set('ETag', etag);
  headers.set('Cache-Control', options.cacheControl || 'public, s-maxage=60, stale-while-revalidate=300');
  headers.set('X-DEUCE-Dataset-Version', options.version);
  const notModified = matchesEtag(request.headers.get('if-none-match'), etag);
  const status = notModified ? 304 : 200;
  observeApiRequest(options.route, status, performance.now() - options.started);
  return notModified ? new Response(null, { status, headers }) : Response.json(payload, { headers });
}
