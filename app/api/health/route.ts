import { deploymentMetadata } from '@/lib/deployment';
import { preparedBundledManifest } from '@/lib/revista/read-records';
import { requestId } from '@/lib/structured-log';

export const dynamic = 'force-dynamic';

/** Fast liveness/readiness check: no provider, database or remote blob access. */
export async function GET(request: Request) {
  const id = requestId(request);
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': id };
  try {
    const manifest = await preparedBundledManifest();
    return Response.json({
      status: 'ok', service: 'deuce', check: 'liveness', datasetVersion: manifest.version,
      generatedAt: manifest.generatedAt, matches: manifest.matchCount,
      bundledDataset: { role: 'validated-fallback', version: manifest.version, generatedAt: manifest.generatedAt, matches: manifest.matchCount },
      servingDataset: { status: 'verify-at-readiness', endpoint: '/api/health/ready' },
      statistics: manifest.pieces.length + (manifest.circuitPieces?.wta.length || 0),
      statisticsByTour: { atp: manifest.pieces.length, wta: manifest.circuitPieces?.wta.length || 0 },
      deployment: deploymentMetadata(),
      readiness: '/api/health/ready', semantics: 'This endpoint proves process liveness and bundled fallback integrity; readiness checks the serving generation.',
    }, { headers: { ...headers, 'X-DEUCE-Dataset-Version': manifest.version } });
  } catch {
    return Response.json({ status: 'unavailable', requestId: id }, { status: 503, headers });
  }
}
