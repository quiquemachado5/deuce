import { authorizedCronRequest } from '@/lib/cron-auth'
import {cloudRead,cloudWrite} from '@/lib/cloud-archive'
import {assertReleaseCoverage} from '@/lib/revista/release-check'
import {readFile} from 'node:fs/promises'
import {gunzipSync} from 'node:zlib'
import {join} from 'node:path'
import {compatibleManifest} from '@/lib/revista/generation'
import type {RecordManifest} from '@/lib/revista/snapshot'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!authorizedCronRequest(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    console.info('Daily publication: started')
    const refresh=await cloudRead('sync-status')
    const lastSuccessfulRefresh = refresh?.status === 'success' ? refresh.at : refresh?.lastSuccessAt
    if(!Number.isFinite(Date.parse(lastSuccessfulRefresh))||Date.now()-Date.parse(lastSuccessfulRefresh)>30*3600000)throw new Error('No recent successful provider refresh; keeping the previous publication')
    const [{ publicationArchive, competitionEntries, editionSourceAudit }, { compileRecordSnapshot }, { publishRecordSnapshot }] = await Promise.all([
      import('@/lib/live-tennis'),
      import('@/lib/revista/snapshot'),
      import('@/lib/revista/publish-snapshot'),
    ])
    const bundled=JSON.parse(gunzipSync(await readFile(join(process.cwd(),'data/reading/manifest.json.gz'))).toString()) as RecordManifest
    const remote=await cloudRead('reading-v2-manifest')
    const input=await publicationArchive()
    console.info('Daily publication: archive loaded',input.length,Math.round(process.memoryUsage().rss/1048576))
    const snapshot = compileRecordSnapshot(input,new Date(),await competitionEntries(),await editionSourceAudit())
    console.info('Daily publication: compiled',Math.round(process.memoryUsage().rss/1048576))
    if (!snapshot.matches.length) throw new Error('Cannot publish an empty reading snapshot')
    assertReleaseCoverage(bundled,snapshot.manifest)
    if(compatibleManifest(remote))assertReleaseCoverage(remote,snapshot.manifest)
    await publishRecordSnapshot(snapshot)
    await cloudWrite('publish-status',{status:'success',at:new Date().toISOString(),version:snapshot.manifest.version,matches:snapshot.manifest.matchCount,lists:snapshot.manifest.pieces.length})
    return Response.json({ status: 'success', at: new Date().toISOString(), matches: snapshot.manifest.matchCount, lists: snapshot.manifest.pieces.length, version: snapshot.manifest.version }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error'
    await cloudWrite('publish-status',{status:'error',at:new Date().toISOString(),message:reason}).catch(()=>undefined)
    console.error('Daily reading snapshot publication failed:', reason)
    return Response.json({ error: 'Publish failed; the saved archive remains available' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
