import { cloudArchiveConfigured, cloudArchiveLastCapacity, cloudProbeRead } from '@/lib/cloud-archive';
import { deploymentMetadata } from '@/lib/deployment';
import { editionCompleteness } from '@/lib/edition-audit';
import { generationMetadata } from '@/lib/revista/generation';
import { preparedDataCacheDiagnostics, preparedEditionAudit, preparedGeneration, preparedMatchBrowserIndex } from '@/lib/revista/read-records';
import { logEvent, requestId } from '@/lib/structured-log';
import { readSchedulerHealth } from '@/lib/scheduler-health';
import { compareCircuitFreshness, recentRefreshFreshnessIssue } from '@/lib/circuit-freshness';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function recentStatus(value: unknown) {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const at = typeof row.at === 'string' && Number.isFinite(Date.parse(row.at)) ? row.at : null;
  return {
    status: typeof row.status === 'string' ? row.status : 'unavailable', at,
    phase: typeof row.phase === 'string' ? row.phase : undefined,
    detail: typeof row.message === 'string' ? row.message.slice(0, 120)
      : typeof row.reason === 'string' ? row.reason.slice(0, 120) : undefined,
    lastSuccessAt: typeof row.lastSuccessAt === 'string' && Number.isFinite(Date.parse(row.lastSuccessAt)) ? row.lastSuccessAt : undefined,
    retryAt: typeof row.retryAt === 'string' && Number.isFinite(Date.parse(row.retryAt)) ? row.retryAt : undefined,
    latestProviderDate: typeof row.latestProviderDate === 'string' ? row.latestProviderDate : undefined,
    probe: row.probe && typeof row.probe === 'object' ? row.probe : undefined,
    publicationCycle: typeof row.publicationCycle === 'string' ? row.publicationCycle : undefined,
    backfillDay: typeof row.backfillDay === 'string' ? row.backfillDay : undefined,
    initialSeed: row.initialSeed === true,
    historicalCohorts: Number.isSafeInteger(row.historicalCohorts) ? Number(row.historicalCohorts) : undefined,
    totalHistoricalCohorts: Number.isSafeInteger(row.totalHistoricalCohorts) ? Number(row.totalHistoricalCohorts) : undefined,
    pendingModern: Number.isSafeInteger(row.pendingModern) ? Number(row.pendingModern) : undefined,
    ageHours: at ? Math.round(Math.max(0, (Date.now() - Date.parse(at)) / 3_600_000) * 10) / 10 : null,
  };
}

function recoveryStatus(value: unknown) {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    ...recentStatus(value),
    restoreValidated: row.restoreValidated === true,
    backupAt: typeof row.backupAt === 'string' && Number.isFinite(Date.parse(row.backupAt)) ? row.backupAt : undefined,
    backupAgeHours: Number.isFinite(row.backupAgeHours) ? Number(row.backupAgeHours) : undefined,
    archive: typeof row.archive === 'string' ? row.archive.slice(0, 160) : undefined,
  };
}

function hostStatus(value: unknown) {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const at = typeof row.at === 'string' && Number.isFinite(Date.parse(row.at)) ? row.at : null;
  const metric = (name:string) => Number.isFinite(row[name]) ? Number(row[name]) : undefined;
  return {
    status: typeof row.status === 'string' ? row.status : 'unavailable', at,
    ageMinutes: at ? Math.round(Math.max(0,(Date.now()-Date.parse(at))/60_000)) : null,
    diskUsedPercent: metric('diskUsedPercent'), availableMemoryBytes: metric('availableMemoryBytes'),
    webMemoryBytes: metric('webMemoryBytes'), webMemoryLimitBytes: metric('webMemoryLimitBytes'),
    web: typeof row.web === 'string' ? row.web : undefined,
    scheduler: typeof row.scheduler === 'string' ? row.scheduler : undefined,
    proxy: typeof row.proxy === 'string' ? row.proxy : undefined,
  };
}

export async function GET(request: Request) {
  const started = performance.now(), id = requestId(request);
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': id };
  try {
    const [generation, browser, editions, sync, wtaSync, wtaBackfill, publication, backup, restoreDrill, hostProbe, capacity, scheduler] = await Promise.all([
      preparedGeneration(), preparedMatchBrowserIndex(), preparedEditionAudit(), cloudProbeRead('sync-status'), cloudProbeRead('wta-sync-status'), cloudProbeRead('wta-backfill-status'), cloudProbeRead('publish-status'), cloudProbeRead('backup-status'), cloudProbeRead('restore-drill-status'), cloudProbeRead('host-status'), cloudArchiveLastCapacity(1_500), readSchedulerHealth(),
    ]);
    const browserCount = browser.index.partitions.reduce((sum, partition) => sum + partition.count, 0);
    if (browser.manifest.version !== generation.manifest.version || browserCount !== generation.manifest.matchCount) {
      throw new Error('Match browser generation is incomplete');
    }
    const auditedEditions = editions.map(edition => ({ ...edition, ...editionCompleteness(edition) }));
    const ageHours = Math.max(0, (Date.now() - Date.parse(generation.manifest.generatedAt)) / 3_600_000);
    const refresh = recentStatus(sync), wtaRefresh = recentStatus(wtaSync), historicalBackfill=recentStatus(wtaBackfill), published = recentStatus(publication);
    const configured = cloudArchiveConfigured();
    const dailyIssue = configured && [refresh, wtaRefresh, published].some(row => row.status !== 'success' || row.ageHours === null || row.ageHours > 36);
    const freshness = {
      atp: { ...(generation.manifest.circuitFreshness?.atp || {}), ...compareCircuitFreshness(refresh.latestProviderDate,generation.manifest.circuitFreshness?.atp.latestExactDate) },
      wta: { ...(generation.manifest.circuitFreshness?.wta || {}), ...compareCircuitFreshness(wtaRefresh.latestProviderDate,generation.manifest.circuitFreshness?.wta.latestExactDate) },
    };
    const freshnessIssue = configured && (recentRefreshFreshnessIssue(refresh,freshness.atp)
      ||recentRefreshFreshnessIssue(wtaRefresh,freshness.wta));
    const schedulerIssue = scheduler.configured && scheduler.status !== 'healthy';
    const host=hostStatus(hostProbe),hostIssue=host.at!==null&&(host.status!=='healthy'||(host.ageMinutes??0)>15);
    const status = generation.fallbackReason || ageHours > 72 || dailyIssue || freshnessIssue || schedulerIssue || hostIssue || !capacity.available ? 'degraded' : 'healthy';
    const elapsedMs = Math.round(performance.now() - started);
    logEvent(status === 'healthy' ? 'info' : 'warn', 'health.deep', { requestId: id, status, elapsedMs, source: generation.source, fallbackReason: generation.fallbackReason });
    return Response.json({
      status, ...generationMetadata(generation), deployment: deploymentMetadata(),
      matches: generation.manifest.matchCount, tours: generation.manifest.summary.tours,
      statistics: generation.manifest.pieces.length + (generation.manifest.circuitPieces?.wta.length || 0),
      statisticsByTour: { atp: generation.manifest.pieces.length, wta: generation.manifest.circuitPieces?.wta.length || 0 },
      matchBrowser: { complete: true, matches: browserCount, partitions: browser.index.partitions.length },
      cache: preparedDataCacheDiagnostics(),
      editionCoverage: { audited: auditedEditions.length, incomplete: auditedEditions.filter(edition => edition.completeDraw === false).length, pendingResults: auditedEditions.reduce((sum, edition) => sum + edition.pending, 0) },
      ageHours: Math.round(ageHours * 10) / 10, staleAfterHours: 72, elapsedMs,
      remoteArchive: { configured, reachable: !generation.fallbackReason },
      storage: { ...capacity.report, maximumBytes: capacity.maximum, available: capacity.available },
      scheduler,
      host,
      circuitFreshness: freshness,
      initialSeed: published.initialSeed,
      dailyUpdate: { refresh, atp: refresh, wta: wtaRefresh, publication: published, staleAfterHours: 36 },
      historicalBackfill,
      recovery: { backup: recoveryStatus(backup), restore: recoveryStatus(restoreDrill), backupStaleAfterHours: 36, restoreStaleAfterHours: 192 },
    }, { headers: { ...headers, 'X-DEUCE-Dataset-Version': generation.manifest.version } });
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - started);
    logEvent('error', 'health.deep.failed', { requestId: id, elapsedMs, error: error instanceof Error ? error.name : 'unknown' });
    return Response.json({ status: 'unavailable', requestId: id, deployment: deploymentMetadata(), elapsedMs }, { status: 503, headers });
  }
}
