import { authorizedCronRequest } from '@/lib/cron-auth'
import {cloudRead,cloudWrite} from '@/lib/cloud-archive'
import {assertEditionCoverage,assertReleaseCoverage} from '@/lib/revista/release-check'
import {revalidatePath} from 'next/cache'
import {comparePublishedMatches} from '@/lib/publication-delta'
import {gzipSync} from 'node:zlib'
import {preparedGeneration,invalidatePreparedGeneration,preparedEditionAudit} from '@/lib/revista/read-records'
import {readFile} from 'node:fs/promises'
import {gunzipSync} from 'node:zlib'
import {join} from 'node:path'
import {compatibleManifest} from '@/lib/revista/generation'
import type {RecordManifest} from '@/lib/revista/snapshot'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const cronAuthorized = authorizedCronRequest(request)
  const backfillAuthorized = authorizedCronRequest(request, process.env.WTA_BACKFILL_SECRET)
  if (!cronAuthorized && !backfillAuthorized) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const previousStatus=await cloudRead('publish-status').catch(()=>undefined)
  const attemptAt=new Date().toISOString()
  const lastSuccessAt=previousStatus?.status==='success'?previousStatus.at:previousStatus?.lastSuccessAt
  try {
    await cloudWrite('publish-status',{status:'running',at:attemptAt,attemptAt,lastSuccessAt})
    console.info('Daily publication: started')
    const refresh=await cloudRead('sync-status')
    const lastSuccessfulRefresh = refresh?.status === 'success' ? refresh.at : refresh?.lastSuccessAt
    if(refresh?.status!=='success'||!Number.isFinite(Date.parse(lastSuccessfulRefresh))||Date.now()-Date.parse(lastSuccessfulRefresh)>12*3600000)throw new Error('No recent successful provider refresh; keeping the previous publication')
    const [{ publicationArchive, competitionEntries, editionSourceAudit }, { compileRecordSnapshot }, { publishRecordSnapshot }] = await Promise.all([
      import('@/lib/live-tennis'),
      import('@/lib/revista/snapshot'),
      import('@/lib/revista/publish-snapshot'),
    ])
    const bundled=JSON.parse(gunzipSync(await readFile(join(process.cwd(),'data/reading/manifest.json.gz'))).toString()) as RecordManifest
    const remote=await cloudRead('reading-v2-manifest')
    const wtaRefresh=await cloudRead('wta-sync-status')
    const publishedWta=compatibleManifest(remote)?remote.summary.tours.wta:bundled.summary.tours.wta
    if(publishedWta>0){
      const lastSuccessfulWta=wtaRefresh?.status==='success'?wtaRefresh.at:wtaRefresh?.lastSuccessAt
      if(wtaRefresh?.status!=='success'||!Number.isFinite(Date.parse(lastSuccessfulWta))||Date.now()-Date.parse(lastSuccessfulWta)>12*3_600_000)throw new Error('No recent successful WTA refresh; keeping the previous publication')
    }
    const [input,previousAudit]=await Promise.all([publicationArchive(),preparedEditionAudit()])
    console.info('Daily publication: archive loaded',input.length,Math.round(process.memoryUsage().rss/1048576))
    const snapshot = compileRecordSnapshot(input,new Date(),await competitionEntries(),await editionSourceAudit())
    assertEditionCoverage(previousAudit,snapshot.audit)
    console.info('Daily publication: compiled',Math.round(process.memoryUsage().rss/1048576))
    if (!snapshot.matches.length) throw new Error('Cannot publish an empty reading snapshot')
    assertReleaseCoverage(bundled,snapshot.manifest)
    if(compatibleManifest(remote))assertReleaseCoverage(remote,snapshot.manifest)
    const baseline=await preparedGeneration()
    const {delta,changes}=comparePublishedMatches(await baseline.matches(),snapshot.matches)
    snapshot.manifest.publicationDelta=delta
    // Immutable correction provenance survives serving-generation retention.
    // It is written before the pointer; an interrupted attempt cannot lose evidence.
    if(changes.length)await cloudWrite(`archive-history-${snapshot.manifest.version}`,{encoding:'gzip-base64',gzip:gzipSync(JSON.stringify({at:attemptAt,fromVersion:baseline.manifest.version,toVersion:snapshot.manifest.version,source:'Live Tennis API',sourceUrl:'https://api.livetennisapi.com/api/public/v1',validation:'explicit circuit, unique identity, preserved published IDs',changes})).toString('base64')})
    const published=await publishRecordSnapshot(snapshot)
    invalidatePreparedGeneration()
    revalidatePath('/', 'layout')

    const incompleteEditions=snapshot.audit.filter(edition=>edition.completeDraw===false).length
    const tours=snapshot.manifest.summary.tours
    await cloudWrite('publish-status',{status:'success',attemptAt,lastSuccessAt:new Date().toISOString(),delta,publicationAt:published.generatedAt,at:new Date().toISOString(),version:snapshot.manifest.version,matches:snapshot.manifest.matchCount,tours,lists:snapshot.manifest.pieces.length,incompleteEditions})
    return Response.json({ status: 'success', at: new Date().toISOString(), matches: snapshot.manifest.matchCount, tours, lists: snapshot.manifest.pieces.length, incompleteEditions, version:snapshot.manifest.version }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error'
    await cloudWrite('publish-status',{status:'error',attemptAt,lastSuccessAt,at:new Date().toISOString(),message:reason}).catch(()=>undefined)
    console.error('Daily reading snapshot publication failed:', reason)
    return Response.json({ error: 'Publish failed; the saved archive remains available' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
