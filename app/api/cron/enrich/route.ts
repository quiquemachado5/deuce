import { enrichCloudArchive } from '@/lib/cloud-archive';
import { authorizedCronRequest } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!authorizedCronRequest(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await enrichCloudArchive();
    const accepted = ['success', 'quota-reserve', 'storage-reserve', 'storage-unverified', 'busy'].includes(result.status);
    return Response.json(result, { status: accepted ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    console.error('Detail enrichment failed');
    return Response.json({ error: 'Detail enrichment failed; publication remains independent' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
