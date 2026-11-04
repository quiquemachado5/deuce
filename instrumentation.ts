import type { Instrumentation } from 'next';

export function register() {
  console.info(JSON.stringify({
    at: new Date().toISOString(),
    level: 'info',
    event: 'server.started',
    runtime: process.env.NEXT_RUNTIME || 'unknown',
    commit: (process.env.COMMIT_REF || process.env.GITHUB_SHA)?.slice(0, 40) || null,
  }));
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const digest = error && typeof error === 'object' && 'digest' in error ? String(error.digest).slice(0, 96) : undefined;
  console.error(JSON.stringify({
    at: new Date().toISOString(),
    level: 'error',
    event: 'server.request.failed',
    method: request.method,
    path: request.path.split('?')[0].slice(0, 180),
    route: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
    error: error instanceof Error ? error.name : 'UnknownError',
    digest,
  }));
};
