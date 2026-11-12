'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';

function send(payload: Record<string, unknown>) {
  const width = window.innerWidth;
  const device = width < 760 ? 'mobile' : width < 1100 ? 'tablet' : 'desktop';
  const body = JSON.stringify({ ...payload, path: location.pathname, device });
  if (!navigator.sendBeacon?.('/api/telemetry', body)) {
    void fetch('/api/telemetry', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
  }
}

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];
const report: ReportWebVitalsCallback = metric => send({
  kind: 'web-vital', name: metric.name, value: metric.value, delta: metric.delta,
  rating: metric.rating, id: metric.id,
});

export function WebVitals() {
  const pathname = usePathname();
  const transitionStart = useRef<number | null>(null);
  useReportWebVitals(report);
  useEffect(() => {
    if (transitionStart.current === null) return;
    const startedAt = transitionStart.current;
    transitionStart.current = null;
    const frame = requestAnimationFrame(() => send({
      kind: 'navigation',
      value: performance.now() - startedAt,
      navigationType: 'route-transition',
    }));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  useEffect(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navigation) send({ kind: 'navigation', value: navigation.duration, navigationType: navigation.type });

    const onError = (event: ErrorEvent) => send({ kind: 'client-error', error: event.error instanceof Error ? event.error.name : 'Error' });
    const onRejection = (event: PromiseRejectionEvent) => send({
      kind: 'unhandled-rejection',
      error: event.reason instanceof Error ? event.reason.name : 'Rejection',
    });
    addEventListener('error', onError);
    addEventListener('unhandledrejection', onRejection);

    const onInternalNavigation = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const destination = new URL(anchor.href, location.href);
      if (destination.origin !== location.origin || destination.pathname === location.pathname) return;
      transitionStart.current = performance.now();
    };
    const onHistoryNavigation = () => { transitionStart.current = performance.now(); };
    document.addEventListener('click', onInternalNavigation, true);
    addEventListener('popstate', onHistoryNavigation);

    let skeletonStart: number | null = null;
    let sampleFrame: number | null = null;
    const skeletonRoot = document.getElementById('main-content') || document.body;
    const sampleSkeleton = () => {
      sampleFrame = null;
      const loading = Boolean(skeletonRoot.querySelector('[role="status"][aria-label="Cargando contenido"]'));
      if (loading && skeletonStart === null) skeletonStart = performance.now();
      if (!loading && skeletonStart !== null) {
        send({ kind: 'navigation', value: performance.now() - skeletonStart, navigationType: 'skeleton' });
        skeletonStart = null;
      }
    };
    const scheduleSkeletonSample = () => {
      if (sampleFrame === null) sampleFrame = requestAnimationFrame(sampleSkeleton);
    };
    sampleSkeleton();
    const observer = new MutationObserver(scheduleSkeletonSample);
    observer.observe(skeletonRoot, { childList: true, subtree: true });
    return () => {
      removeEventListener('error', onError);
      removeEventListener('unhandledrejection', onRejection);
      document.removeEventListener('click', onInternalNavigation, true);
      removeEventListener('popstate', onHistoryNavigation);
      observer.disconnect();
      if (sampleFrame !== null) cancelAnimationFrame(sampleFrame);
    };
  }, []);
  return null;
}
