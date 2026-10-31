function send(kind: string, fields: Record<string, string>) {
  try {
    navigator.sendBeacon('/api/telemetry', JSON.stringify({ kind, path: location.pathname, ...fields }));
  } catch { /* Observability must never affect navigation. */ }
}

window.addEventListener('error', event => send('client-error', {
  error: event.error instanceof Error ? event.error.name : 'Error',
}));
window.addEventListener('unhandledrejection', event => send('unhandled-rejection', {
  error: event.reason instanceof Error ? event.reason.name : 'UnhandledRejection',
}));

export function onRouterTransitionStart(url: string, navigationType: 'push' | 'replace' | 'traverse') {
  send('navigation', { destination: url.slice(0, 180), navigationType });
}
