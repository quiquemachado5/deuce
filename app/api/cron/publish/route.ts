import { authorizedCronRequest } from '@/lib/cron-auth'
import {cloudRead,cloudWrite} from '@/lib/cloud-archive'
import {assertReleaseCoverage} from '@/lib/revista/release-check'
import {preparedGeneration} from '@/lib/revista/read-records'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!authorizedCronRequest(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const refresh=await cloudRead('sync-status')
    if(refresh?.status!=='success'||!Number.isFinite(Date.parse(refresh.at))||Date.now()-Date.parse(refresh.at)>30*3600000)throw new Error('No recent successful provider refresh; keeping the previous publication')
    const [{ editorialArchive,invalidateEditorialCache }, { compileRecordSnapshot }, { publishRecordSnapshot }] = await Promise.all([
      import('@/lib/editorial-data'),
      import('@/lib/revista/snapshot'),
      import('@/lib/revista/publish-snapshot'),
    ])
    invalidateEditorialCache()
    const baseline=await preparedGeneration()
    const snapshot = compileRecordSnapshot(await editorialArchive())
    if (!snapshot.matches.length) throw new Error('Cannot publish an empty reading snapshot')
    assertReleaseCoverage(baseline.manifest,snapshot.manifest)
    await publishRecordSnapshot(snapshot)
    await cloudWrite('publish-status',{status:'success',at:new Date().toISOString(),version:snapshot.manifest.version,matches:snapshot.manifest.matchCount,lists:snapshot.manifest.pieces.length})
    return Response.json({ status: 'success', at: new Date().toISOString(), matches: snapshot.manifest.matchCount, lists: snapshot.manifest.pieces.length, version: snapshot.manifest.version }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    await cloudWrite('publish-status',{status:'error',at:new Date().toISOString()}).catch(()=>undefined)
    console.error('Daily reading snapshot publication failed:', error instanceof Error ? error.message : 'unknown error')
    return Response.json({ error: 'Publish failed; the saved archive remains available' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
