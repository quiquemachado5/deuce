import {publishedWikiContexts} from '@/lib/wikimedia-refresh'
import {enrichMatchAges} from '@/lib/wikimedia-context'
import { authorizedCronRequest } from '@/lib/cron-auth'
import { unauthorizedResponse } from '@/lib/security-events'
import {cloudRead,cloudWrite} from '@/lib/cloud-archive'
import {assertEditionCoverage,assertReleaseCoverage} from '@/lib/revista/release-check'
import {revalidatePath} from 'next/cache'
import {buildPublicationIndex,comparePublicationIndexes,validPublicationIndex} from '@/lib/publication-index'
import {gzipSync} from 'node:zlib'
import {preparedGeneration,invalidatePreparedGeneration,preparedEditionAudit,preparedPublicationIndex,preparedMatchDetail} from '@/lib/revista/read-records'
import {readFile} from 'node:fs/promises'
import {gunzipSync} from 'node:zlib'
import {join} from 'node:path'
import {compatibleManifest} from '@/lib/revista/generation'
import type {RecordManifest} from '@/lib/revista/snapshot'
import {withOperationHistory} from '@/lib/archive-operations'
import {readingDirectory} from '@/lib/reading-directory'
import {assertCircuitPublicationFreshness} from '@/lib/circuit-freshness'
import {publishedMatches} from '@/lib/publication-scope'
import {acquireArchiveLease} from '@/lib/archive-store'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'
const MAX_REFRESH_AGE_MS = 36 * 3_600_000

export async function GET(request: Request) {
  const cronAuthorized = authorizedCronRequest(request)
  const backfillAuthorized = authorizedCronRequest(request, process.env.WTA_BACKFILL_SECRET)
  if (!cronAuthorized && !backfillAuthorized) return unauthorizedResponse(request, 'cron.publish')
  const release=await acquireArchiveLease('tennis-provider',600)
  if(!release)return Response.json({status:'busy',error:'Archive mutation is already in progress'},{status:503,headers:{'Cache-Control':'no-store'}})
  try {
    const previousStatus=await cloudRead('publish-status').catch(()=>undefined)
    const attemptAt=new Date().toISOString()
    const lastSuccessAt=previousStatus?.status==='success'?previousStatus.at:previousStatus?.lastSuccessAt
    const memory:{phase:string;rssBytes:number;heapUsedBytes:number}[]=[]
    const sampleMemory=(phase:string)=>{const usage=process.memoryUsage();memory.push({phase,rssBytes:usage.rss,heapUsedBytes:usage.heapUsed})}
    sampleMemory('start')
    try {
      await cloudWrite('publish-status',withOperationHistory(previousStatus,{status:'running',at:attemptAt,attemptAt,lastSuccessAt}))
      console.info('Daily publication: started')
      const refresh=await cloudRead('sync-status')
      const lastSuccessfulRefresh = refresh?.status === 'success' ? refresh.at : refresh?.lastSuccessAt
      if(refresh?.status!=='success'||!Number.isFinite(Date.parse(lastSuccessfulRefresh))||Date.now()-Date.parse(lastSuccessfulRefresh)>MAX_REFRESH_AGE_MS)throw new Error('No recent successful provider refresh; keeping the previous publication')
      const [{ publicationArchive, competitionEntries, editionSourceAudit }, { compileRecordSnapshot }, { publishRecordSnapshot }] = await Promise.all([
        import('@/lib/live-tennis'),
        import('@/lib/revista/snapshot'),
        import('@/lib/revista/publish-snapshot'),
      ])
      const bundled=JSON.parse(gunzipSync(await readFile(join(readingDirectory(),'manifest.json.gz'))).toString()) as RecordManifest
      const remote=await cloudRead('reading-v2-manifest')
      const wtaRefresh=await cloudRead('wta-sync-status')
      const publishedWta=compatibleManifest(remote)?remote.summary.tours.wta:bundled.summary.tours.wta
      if(publishedWta>0){
        const lastSuccessfulWta=wtaRefresh?.status==='success'?wtaRefresh.at:wtaRefresh?.lastSuccessAt
        if(wtaRefresh?.status!=='success'||!Number.isFinite(Date.parse(lastSuccessfulWta))||Date.now()-Date.parse(lastSuccessfulWta)>MAX_REFRESH_AGE_MS)throw new Error('No recent successful WTA refresh; keeping the previous publication')
      }
      const [loadedInput,previousAudit]=await Promise.all([publicationArchive(),preparedEditionAudit()])
      // A provider refresh is incremental, not proof that an archived match vanished.
      // Keep previously published identities absent from raw lists, with their original
      // evidence, while reviewed scope exclusions still apply through publishedMatches.
      const previousIndex=await preparedPublicationIndex()
      if(!validPublicationIndex(previousIndex))throw new Error('Previous publication index is invalid')
      const loadedIds=new Set(loadedInput.map(match=>`${match.tour||'atp'}:${match.match_id}`))
      for(const entry of previousIndex.entries){
        if(loadedIds.has(entry.identity))continue
        const id=entry.identity.slice(entry.tour.length+1)
        const saved=await preparedMatchDetail(id)
        if(!saved||saved.tour!==entry.tour||saved.year!==entry.year||saved.match_id!==id)throw new Error('Previously published match cannot be recovered: '+entry.identity)
        loadedInput.push(...publishedMatches([saved]))
      }
      const input=enrichMatchAges(loadedInput,await publishedWikiContexts())
      sampleMemory('archive-loaded')
      console.info('Daily publication: archive loaded',input.length,Math.round(process.memoryUsage().rss/1048576))
      const snapshot = compileRecordSnapshot(input,new Date(),await competitionEntries(),await editionSourceAudit())
      // compileRecordSnapshot owns normalized copies. Release the large raw
      // array before opening any previous-generation metadata.
      input.length=0
      loadedInput.length=0
      sampleMemory('compiled')
      const circuitFreshness = {
        atp: assertCircuitPublicationFreshness('atp',refresh.latestProviderDate,snapshot.manifest.circuitFreshness?.atp.latestExactDate),
        ...(publishedWta>0?{wta:assertCircuitPublicationFreshness('wta',wtaRefresh.latestProviderDate,snapshot.manifest.circuitFreshness?.wta.latestExactDate)}:{}),
      }
      assertEditionCoverage(previousAudit,snapshot.audit)
      console.info('Daily publication: compiled',Math.round(process.memoryUsage().rss/1048576))
      if (!snapshot.matches.length) throw new Error('Cannot publish an empty reading snapshot')
      assertReleaseCoverage(bundled,snapshot.manifest)
      if(compatibleManifest(remote))assertReleaseCoverage(remote,snapshot.manifest)
      const baseline=await preparedGeneration()
      snapshot.publicationIndex=buildPublicationIndex(snapshot.matches)
      const storedIndex=await preparedPublicationIndex()
      if(!validPublicationIndex(storedIndex))throw new Error('Previous publication index is invalid')
      const {delta,changes}=comparePublicationIndexes(storedIndex,snapshot.publicationIndex)
      sampleMemory(validPublicationIndex(storedIndex)?'indexed':'indexed-migrated')
      snapshot.manifest.publicationDelta=delta
      // Immutable correction provenance survives serving-generation retention.
      // It is written before the pointer; an interrupted attempt cannot lose evidence.
      if(changes.length)await cloudWrite(`archive-history-${snapshot.manifest.version}`,{encoding:'gzip-base64',gzip:gzipSync(JSON.stringify({at:attemptAt,fromVersion:baseline.manifest.version,toVersion:snapshot.manifest.version,source:'Live Tennis API',sourceUrl:'https://api.livetennisapi.com/api/public/v1',validation:'explicit circuit, unique identity, preserved published IDs',changes})).toString('base64')})
      const published=await publishRecordSnapshot(snapshot)
      sampleMemory('published')
      invalidatePreparedGeneration()
      revalidatePath('/', 'layout')

      const incompleteEditions=snapshot.audit.filter(edition=>edition.completeDraw===false).length
      const tours=snapshot.manifest.summary.tours
      const lists=snapshot.manifest.pieces.length+(snapshot.manifest.circuitPieces?.wta.length||0)
      const peakRssBytes=Math.max(...memory.map(row=>row.rssBytes))
      await cloudWrite('publish-status',withOperationHistory(previousStatus,{status:'success',attemptAt,lastSuccessAt:new Date().toISOString(),delta,publicationAt:published.generatedAt,at:new Date().toISOString(),version:snapshot.manifest.version,matches:snapshot.manifest.matchCount,tours,lists,incompleteEditions,circuitFreshness,memory:{peakRssBytes,phases:memory}}))
      return Response.json({ status: 'success', at: new Date().toISOString(), matches: snapshot.manifest.matchCount, tours, lists, incompleteEditions, version:snapshot.manifest.version, circuitFreshness }, { headers: { 'Cache-Control':'no-store' } })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error'
      sampleMemory('failed')
      await cloudWrite('publish-status',withOperationHistory(previousStatus,{status:'error',attemptAt,lastSuccessAt,at:new Date().toISOString(),message:reason,memory:{peakRssBytes:Math.max(...memory.map(row=>row.rssBytes)),phases:memory}})).catch(()=>undefined)
      console.error('Daily reading snapshot publication failed:', reason)
      return Response.json({ error: 'Publish failed; the saved archive remains available' }, { status: 503, headers: { 'Cache-Control':'no-store' } })
    }
  } finally {
    await release()
  }
}
