import { refreshCloudWta } from '@/lib/cloud-archive'
import { authorizedCronRequest } from '@/lib/cron-auth'
import { unauthorizedResponse } from '@/lib/security-events'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authorized = authorizedCronRequest(request)
    || authorizedCronRequest(request, process.env.WTA_BACKFILL_SECRET)
  if (!authorized) return unauthorizedResponse(request, 'cron.wta')
  try {
    const result=await refreshCloudWta()
    return Response.json(result,{status:result.status==='success'?200:503,headers:{'Cache-Control':'no-store'}})
  } catch {
    console.error('WTA archive refresh failed')
    return Response.json({error:'WTA refresh failed; the published archive remains available'},{status:503,headers:{'Cache-Control':'no-store'}})
  }
}
