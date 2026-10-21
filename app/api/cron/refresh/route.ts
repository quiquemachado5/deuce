import { refreshCloudArchive } from '@/lib/cloud-archive'
import { authorizedCronRequest } from '@/lib/cron-auth'
export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  if (!authorizedCronRequest(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result=await refreshCloudArchive();
    if(result.status==='success'){
      const {invalidateEditorialCache}=await import('@/lib/editorial-data');
      invalidateEditorialCache();
    }
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  }
  catch { return Response.json({ error: 'Refresh failed; the saved archive remains available' }, { status: 503 }) }
}
