import { authorizedCronRequest } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!authorizedCronRequest(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [{ editorialArchive }, { compileRecordSnapshot }, { publishRecordSnapshot }] = await Promise.all([
      import('@/lib/editorial-data'),
      import('@/lib/revista/snapshot'),
      import('@/lib/revista/publish-snapshot'),
    ])
    const snapshot = compileRecordSnapshot(await editorialArchive())
    if (!snapshot.matches.length) throw new Error('Cannot publish an empty reading snapshot')
    await publishRecordSnapshot(snapshot)
    return Response.json({ status: 'success', at: new Date().toISOString(), matches: snapshot.manifest.matchCount, lists: snapshot.manifest.pieces.length, version: snapshot.manifest.version }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Daily reading snapshot publication failed:', error instanceof Error ? error.message : 'unknown error')
    return Response.json({ error: 'Publish failed; the saved archive remains available' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
