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
      status: 'ok', service: 'deuce', datasetVersion: manifest.version,
      generatedAt: manifest.generatedAt, matches: manifest.matchCount,
      statistics: manifest.pieces.length, deployment: deploymentMetadata(),
      deepHealth: '/api/health/deep',
    }, { headers: { ...headers, 'X-DEUCE-Dataset-Version': manifest.version } });
  } catch {
    return Response.json({ status: 'unavailable', requestId: id }, { status: 503, headers });
  }
}
