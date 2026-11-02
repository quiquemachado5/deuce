import { backfillCloudWtaHistory } from '@/lib/cloud-archive';
import { authorizedCronRequest } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!authorizedCronRequest(request)
    && !authorizedCronRequest(request, process.env.WTA_BACKFILL_SECRET))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await backfillCloudWtaHistory();
    const accepted = ['success', 'backfill-progress', 'quota-reserve', 'free-history-limit', 'already-attempted', 'waiting-current-publication', 'busy'].includes(result.status);
    return Response.json(result, { status: accepted ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    console.error('WTA historical backfill failed');
    return Response.json({ error: 'WTA historical backfill failed; current publication remains independent' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
