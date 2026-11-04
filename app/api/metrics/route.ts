import { authorizedCronRequest } from '@/lib/cron-auth';
import { preparedDataCacheDiagnostics } from '@/lib/revista/read-records';
import { renderPrometheusMetrics } from '@/lib/runtime-metrics';
import { rateLimitDiagnostics } from '@/lib/rate-limit';
import { cloudProbeRead } from '@/lib/cloud-archive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!authorizedCronRequest(request, process.env.METRICS_SECRET)) return new Response('Unauthorized', { status: 401 });
  const [quota,publication,storage,enrichment,backup,host]=await Promise.all([
    cloudProbeRead('provider-quota-status'),cloudProbeRead('publish-status'),cloudProbeRead('storage-capacity-status'),
    cloudProbeRead('enrichment-status'),cloudProbeRead('backup-status'),cloudProbeRead('host-status'),
  ]);
  const number=(value:unknown)=>Number.isFinite(value)?Number(value):undefined;
  const dateAge=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value))?Math.max(0,(Date.now()-Date.parse(value))/1000):undefined;
  return new Response(renderPrometheusMetrics({ ...preparedDataCacheDiagnostics(), rateLimits: rateLimitDiagnostics() },{
    providerRemaining:number(quota?.remaining),providerReserve:number(quota?.reserve),providerSafeAvailable:number(quota?.safeAvailable),
    publicationPeakRssBytes:number(publication?.memory?.peakRssBytes),storageBytes:number(storage?.report?.relationBytes),storageObjects:number(storage?.report?.objects),
    incompleteEditions:number(publication?.incompleteEditions),enrichmentRemaining:number(enrichment?.remainingCandidates),enrichmentDeferred:number(enrichment?.deferred),
    backupAgeSeconds:dateAge(backup?.at),hostAvailableMemoryBytes:number(host?.availableMemoryBytes),
  }), {
    headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8', 'Cache-Control': 'private, no-store' },
  });
}
