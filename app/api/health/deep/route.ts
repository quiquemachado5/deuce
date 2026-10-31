import { cloudArchiveHasCapacity, cloudClient, cloudRead } from '@/lib/cloud-archive';
import { deploymentMetadata } from '@/lib/deployment';
import { editionCompleteness } from '@/lib/edition-audit';
import { generationMetadata } from '@/lib/revista/generation';
import { preparedEditionAudit, preparedGeneration } from '@/lib/revista/read-records';
import { logEvent, requestId } from '@/lib/structured-log';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function recentStatus(value: unknown) {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const at = typeof row.at === 'string' && Number.isFinite(Date.parse(row.at)) ? row.at : null;
  return {
    status: typeof row.status === 'string' ? row.status : 'unavailable', at,
    detail: typeof row.message === 'string' ? row.message.slice(0, 120) : undefined,
    lastSuccessAt: typeof row.lastSuccessAt === 'string' && Number.isFinite(Date.parse(row.lastSuccessAt)) ? row.lastSuccessAt : undefined,
    ageHours: at ? Math.round(Math.max(0, (Date.now() - Date.parse(at)) / 3_600_000) * 10) / 10 : null,
  };
}

export async function GET(request: Request) {
  const started = performance.now(), id = requestId(request);
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': id };
  try {
    const [generation, editions, sync, wtaSync, publication, capacity] = await Promise.all([
      preparedGeneration(), preparedEditionAudit(), cloudRead('sync-status'), cloudRead('wta-sync-status'), cloudRead('publish-status'), cloudArchiveHasCapacity(),
    ]);
    const auditedEditions = editions.map(edition => ({ ...edition, ...editionCompleteness(edition) }));
    const ageHours = Math.max(0, (Date.now() - Date.parse(generation.manifest.generatedAt)) / 3_600_000);
    const refresh = recentStatus(sync), wtaRefresh = recentStatus(wtaSync), published = recentStatus(publication);
    const configured = Boolean(cloudClient());
    const dailyIssue = configured && [refresh, wtaRefresh, published].some(row => row.status !== 'success' || row.ageHours === null || row.ageHours > 36);
    const status = generation.fallbackReason || ageHours > 72 || dailyIssue || !capacity.available ? 'degraded' : 'healthy';
    const elapsedMs = Math.round(performance.now() - started);
    logEvent(status === 'healthy' ? 'info' : 'warn', 'health.deep', { requestId: id, status, elapsedMs, source: generation.source, fallbackReason: generation.fallbackReason });
    return Response.json({
      status, ...generationMetadata(generation), deployment: deploymentMetadata(),
      matches: generation.manifest.matchCount, statistics: generation.manifest.pieces.length,
      editionCoverage: { audited: auditedEditions.length, incomplete: auditedEditions.filter(edition => edition.completeDraw === false).length, pendingResults: auditedEditions.reduce((sum, edition) => sum + edition.pending, 0) },
      ageHours: Math.round(ageHours * 10) / 10, staleAfterHours: 72, elapsedMs,
      remoteArchive: { configured, reachable: !generation.fallbackReason },
      storage: { ...capacity.report, maximumBytes: capacity.maximum, available: capacity.available },
      dailyUpdate: { refresh, atp: refresh, wta: wtaRefresh, publication: published, staleAfterHours: 36 },
    }, { headers: { ...headers, 'X-DEUCE-Dataset-Version': generation.manifest.version } });
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - started);
    logEvent('error', 'health.deep.failed', { requestId: id, elapsedMs, error: error instanceof Error ? error.name : 'unknown' });
    return Response.json({ status: 'unavailable', requestId: id, deployment: deploymentMetadata(), elapsedMs }, { status: 503, headers });
  }
}
