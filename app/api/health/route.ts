import { preparedGeneration } from '@/lib/revista/read-records';
import { generationMetadata } from '@/lib/revista/generation';

export const dynamic = 'force-dynamic';
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const generation = await preparedGeneration();
    const ageHours = Math.max(0, (Date.now() - Date.parse(generation.manifest.generatedAt)) / 3_600_000);
    return Response.json({ status: generation.fallbackReason || ageHours > 72 ? 'degraded' : 'healthy',
      ...generationMetadata(generation), matches: generation.manifest.matchCount,
      ageHours: Math.round(ageHours * 10) / 10, staleAfterHours: 72,
    }, { headers: { ...headers, 'X-DEUCE-Dataset-Version': generation.manifest.version } });
  } catch { return Response.json({ status: 'unavailable' }, { status: 503, headers }); }
}
