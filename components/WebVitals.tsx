'use client';

import { useReportWebVitals } from 'next/web-vitals';

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];
const report: ReportWebVitalsCallback = metric => {
  const body = JSON.stringify({
    kind: 'web-vital', name: metric.name, value: metric.value, delta: metric.delta,
    rating: metric.rating, id: metric.id, path: location.pathname,
  });
  if (!navigator.sendBeacon?.('/api/telemetry', body)) {
    void fetch('/api/telemetry', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
  }
};

export function WebVitals() {
  useReportWebVitals(report);
  return null;
}
