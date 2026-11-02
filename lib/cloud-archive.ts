import 'server-only'
import { registerArtifactPacks, readSnapshotArtifact } from './revista/artifact-packs'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { loadMissingDetails } from './archive-detail-batches'
import { archiveReadFailure } from './archive-get'
import {
  acquireArchiveLease,
  archiveStoreBackend,
  archiveStoreConfigured,
  archiveStoreReport,
  deleteArchiveKeys,
  legacyArchiveClient,
  listArchiveKeys,
  readArchiveObject,
  writeArchiveObjects,
} from './archive-store'
import { enrichmentPlan } from './enrichment-plan'
import { activityFixtures } from './tour-activity'
import {mergeSeasonBaseline,reconcileSeasonResults,type Season} from './result-refresh'
import { detailRefreshPlan } from './detail-refresh-plan'
import { hasClosedModernResult } from './modern-result'
import { withOperationHistory } from './archive-operations'
import { latestProviderResultDate } from './circuit-freshness'
import { PROVIDER_PUBLICATION_TIERS } from './publication-scope'
import { WTA_HISTORICAL_COHORTS, wtaBackfillCycle, wtaHistoricalCohortIds, wtaHistoricalCohortPlan } from './wta-backfill-schedule'
import { isProviderFreeHistoryLimit, providerHasRequestAfterUsage, providerQuotaRetryAt, providerRemainingCalls } from './provider-quota'
import { materializeBundledWtaArchive } from './wta-archive-bootstrap'

// Provider payloads are schemaless until they are normalized into Match.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ArchiveRow = Record<string, any>
const base = 'https://api.livetennisapi.com/api/public/v1'
/** Legacy Supabase access remains available until the Blob cutover is complete. */
export function cloudClient() {
  if (process.env.CI === '1' || process.env.CI === 'true') return null
  return legacyArchiveClient()
}
export function cloudArchiveConfigured() {
  if (process.env.CI === '1' || process.env.CI === 'true') return false
  return archiveStoreConfigured()
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cache stores heterogeneous archive JSON.
const cache = new Map<string, { at: number; value: Promise<any> }>()
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- callers validate each object contract.
export async function cloudRead(key: string): Promise<any> {
  if (!cloudArchiveConfigured()) return undefined
  const saved = cache.get(key)
  if (saved && Date.now() - saved.at < 300_000) return saved.value
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see cloudRead contract above.
  const pending: { value?: Promise<any> } = {}
  pending.value = (async () => {
    try {
      return await readArchiveObject(key)
    } catch (error) {
      console.error('Cloud archive read failed:', archiveReadFailure(error))
    }
    // An authentication or network error is not a missing object. Let the next
    // request try again instead of caching an empty result for five minutes.
    if (cache.get(key)?.value === pending.value) cache.delete(key)
    return undefined
  })()
  cache.set(key, { at: Date.now(), value: pending.value })
  return pending.value
}

/** A health probe must fail fast instead of consuming the whole function budget. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- health payloads are validated by their caller.
export async function cloudProbeRead(key: string, budget = 1_500): Promise<any> {
  if (!cloudArchiveConfigured()) return undefined
  return readArchiveObject(key, budget)
}

/** Read one immutable artifact from a published records generation. */
export async function cloudSnapshotBlob<T>(version: string, id: string): Promise<T | undefined> {
  const key = `reading-v2-${version}-${id}`
  const manifest = await cloudRead('reading-v2-manifest')
  if(manifest?.version===version)registerArtifactPacks(version,manifest.artifactPacks)
  const index = await readSnapshotArtifact(key,cloudRead) as ArchiveRow | undefined
  if (!index || typeof index !== 'object') return undefined
  try {
    let encoded: string
    if (typeof index.gzip === 'string') encoded = index.gzip
    else {
      const chunks = Number(index.chunks)
      if (index.encoding !== 'gzip-chunks' || !Number.isInteger(chunks) || chunks < 1 || chunks > 256) return undefined
      const parts = await Promise.all(Array.from({ length: chunks }, (_, part) => readSnapshotArtifact(`${key}-chunk${part}`,cloudRead) as Promise<ArchiveRow>))
      if (parts.some(value => typeof value?.chunk !== 'string' || !value.chunk.length)) return undefined
      encoded = parts.map(value => value.chunk).join('')
    }
    return JSON.parse(gunzipSync(Buffer.from(encoded, 'base64')).toString()) as T
  } catch {
    return undefined
  }
}
export type ArchiveWrite = { key: string; payload: unknown }
export async function cloudWriteMany(entries: readonly ArchiveWrite[]) {
  if (!entries.length) return
  await writeArchiveObjects(entries)
  for (const { key } of entries) cache.delete(key)
}
export async function cloudWrite(key: string, payload: unknown) {
  await cloudWriteMany([{ key, payload }])
}
export type ArchiveStorageReport={relationBytes:number;payloadBytes:number;objects:number;snapshots:number;details:number};
export type ArchiveCapacityStatus='available'|'full'|'unknown';
export function archiveCapacityStatus(report:ArchiveStorageReport|undefined,maximum:number):ArchiveCapacityStatus{
  if(!report||!Number.isFinite(maximum)||maximum<=0||Object.values(report).some(value=>!Number.isFinite(value)||value<0))return 'unknown';
  return report.relationBytes<maximum?'available':'full';
}
export function parseArchiveStorageReport(value:unknown):ArchiveStorageReport|undefined{
  if(!Array.isArray(value)||!value[0]||typeof value[0]!=='object')return undefined;
  const row=value[0] as Record<string,unknown>;
  const keys=['relation_bytes','payload_bytes','object_count','snapshot_count','detail_count'] as const;
  const raw=keys.map(key=>row[key]);
  if(raw.some(metric=>metric===null||metric===undefined||(typeof metric==='string'&&!metric.trim())))return undefined;
  const values=raw.map(Number);
  if(values.some(metric=>!Number.isFinite(metric)||metric<0))return undefined;
  return {relationBytes:values[0],payloadBytes:values[1],objects:values[2],snapshots:values[3],details:values[4]};
}
export async function cloudArchiveStorageReport(budget=5_000):Promise<ArchiveStorageReport|undefined>{
  return archiveStoreReport(budget)
}
export async function cloudArchiveHasCapacity(budget?:number){
  const report=await cloudArchiveStorageReport(budget);
  const configured=Number(process.env.DEUCE_ARCHIVE_MAX_BYTES);
  const backend=archiveStoreBackend();
  const defaultMaximum=backend==='vercel-blob'?800_000_000:backend==='filesystem'?150_000_000_000:450_000_000;
  const maximum=Number.isFinite(configured)&&configured>0?configured:defaultMaximum;
  const status=archiveCapacityStatus(report,maximum);
  const result={report,maximum,status,available:status==='available'};
  if(report)await cloudWrite('storage-capacity-status',{...result,checkedAt:new Date().toISOString()});
  return result;
}

/** Keep the active and immediately previous immutable generations only. */
export async function cloudPruneSnapshotGenerations(keepVersions:readonly string[]){
  if(!cloudArchiveConfigured())return 0;
  const keep=new Set(keepVersions.filter(version=>/^[a-f0-9]{20}$/.test(version))),obsolete:string[]=[];
  for(const key of await listArchiveKeys('reading-v2-')){const version=/^reading-v2-([a-f0-9]{20})-/.exec(key)?.[1];if(version&&!keep.has(version))obsolete.push(key);}
  await deleteArchiveKeys(obsolete)
  return obsolete.length;
}
export async function cloudDetails(): Promise<Record<string, ArchiveRow>> {
  if (!cloudArchiveConfigured()) return {}
  const saved = cache.get('detail-index')
  if (saved && Date.now() - saved.at < 300_000) return saved.value
  const value = (async () => {
    const keys = (await listArchiveKeys('detail-')).filter(key => /^detail-(?:wta-)?(modern|archive)-/.test(key))
    const files = await readdir(join(process.cwd(), 'data', 'archive', 'details')).catch(() => [])
    const bundled = new Set(files.filter(f => f.endsWith('.json.gz')).map(f => `detail-${f.slice(0, -8)}`))
    const overrides = await cloudRead('detail-overrides')
    for(const key of overrides?.keys || []) if(typeof key==='string')bundled.delete(key)
    return loadMissingDetails<ArchiveRow>(keys, bundled, async batch => {
      const rows=await Promise.all(batch.map(async key=>({key,payload:await readArchiveObject(key)})))
      return rows.filter((row):row is {key:string;payload:ArchiveRow}=>row.payload!==undefined&&!!row.payload&&typeof row.payload==='object')
    })
  })().catch(error => { cache.delete('detail-index'); console.error('Cloud details read failed:', archiveReadFailure(error)); return {} })
  cache.set('detail-index', { at: Date.now(), value })
  return value
}
async function lease() {
  return acquireArchiveLease('tennis-provider',300)
}
class TennisProviderError extends Error {
  constructor(readonly status:number,detail:string,readonly payload:ArchiveRow={},readonly retryAt?:string){super(`Tennis provider HTTP ${status}: ${detail}`);this.name='TennisProviderError'}
}
function retryAfter(value:string|null){
  if(!value)return undefined
  const seconds=Number(value);if(Number.isFinite(seconds)&&seconds>=0)return new Date(Date.now()+seconds*1_000).toISOString()
  const parsed=Date.parse(value);return Number.isFinite(parsed)?new Date(parsed).toISOString():undefined
}
async function provider(path: string) {
  if (!process.env.TENNIS_API_KEY) throw new Error('Tennis provider is not configured')
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`${base}${path}`, { headers: { 'X-API-Key': process.env.TENNIS_API_KEY }, cache: 'no-store', signal: AbortSignal.timeout(20_000) })
      const text=await response.text()
      let payload:ArchiveRow={}
      try{payload=JSON.parse(text)}catch{}
      if (response.ok) return payload
      const detail=String(payload.detail||payload.message||response.statusText||'request failed').slice(0,160)
      const failure=new TennisProviderError(response.status,detail,payload,retryAfter(response.headers.get('retry-after')))
      if (response.status !== 429 && response.status < 500) throw failure
      lastError = failure
    } catch (error) {
      lastError = error
      if (error instanceof Error && !['AbortError', 'TimeoutError', 'TypeError'].includes(error.name)) throw error
    }
    if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 750))
  }
  throw lastError instanceof Error ? lastError : new Error('Tennis provider request failed')
}
export async function downloadCloudDetail(kind: 'modern' | 'archive', id: string) {
  const key = `detail-${kind}-${id}`
  const saved = await cloudRead(key)
  if (saved) return saved
  if (!process.env.TENNIS_API_KEY || !cloudArchiveConfigured()) return undefined
  const release = await lease()
  if (!release) return undefined
  try {
    const quota = await provider('/usage')
    if (Number(quota.today?.remaining_day || 0) < 80) return undefined
    await new Promise(resolve => setTimeout(resolve, 1300))
    const payload = await provider(kind === 'archive' ? `/history/archive/matches/${id}` : `/history/matches/${id}?points=complete`)
    if (!payload.match && !payload.data && !payload.stats) return undefined
    await cloudWrite(key, payload)
    cache.delete('detail-index')
    return payload
  } catch (error) {
    console.error('Detail ingestion:', error instanceof Error ? error.message : 'failed')
    return undefined
  } finally { await release() }
}
export async function refreshCloudArchive() {
  const release = await lease()
  if (!release) return { status: 'busy' }
  const started = Date.now()
  let calls = 0
  let quota:ArchiveRow|undefined
  const priorStatus=await cloudRead('sync-status').catch(()=>undefined)
  const lastSuccessAt=priorStatus?.status==='success'?priorStatus.at:priorStatus?.lastSuccessAt
  const attemptAt=new Date(started).toISOString()
  try {
    await cloudWrite('sync-status',withOperationHistory(priorStatus,{status:'running',at:attemptAt,attemptAt,lastSuccessAt}))
    const capacity=await cloudArchiveHasCapacity()
    if(!capacity.available){
      const result={status:capacity.status==='full'?'storage-reserve':'storage-unverified',attemptAt,lastSuccessAt,at:new Date().toISOString(),calls,relationBytes:capacity.report?.relationBytes,maximumBytes:capacity.maximum}
      await cloudWrite('sync-status',withOperationHistory(priorStatus,result))
      return result
    }
    calls++
    quota = await provider('/usage')
    const remaining = providerRemainingCalls(quota)
    const wtaReserve=40,callLimit=35
    if (remaining <= wtaReserve) {
      const result = { status: 'quota-reserve', phase:'current-season', attemptAt, at: new Date().toISOString(), remaining, calls, extracted:0, lastSuccessAt, retryAt:providerQuotaRetryAt(quota), probe:{usage:'ok',currentSeason:'deferred'} }
      await cloudWrite('sync-status', withOperationHistory(priorStatus,result))
      return result
    }
    const request = async (path: string) => {
      if (calls >= callLimit || remaining - calls <= wtaReserve || Date.now() - started > 220_000) throw new Error('Sync safety budget reached')
      await new Promise(resolve => setTimeout(resolve, 1300))
      calls++
      return provider(path)
    }
    const year = new Date().getUTCFullYear()
    const {bundledTourSeason}=await import('./live-tennis')
    const old = mergeSeasonBaseline(await bundledTourSeason(year) as Season,await cloudRead(`season-${year}`))
    const seasonsRefreshed:number[]=[]
    const detailCandidates:ArchiveRow[]=[]
    const previousRows=new Map<string,ArchiveRow>()
    let rows:ArchiveRow[]=[],data:ArchiveRow[]=[]
    // Migrate every saved modern season once. Afterwards, poll result restatements
    // across all years as well as the current fixture window.
    for(const season of [year,...Array.from({length:Math.max(0,year-2023)},(_,i)=>2023+i)]){
      const previous=season===year?old:mergeSeasonBaseline(await bundledTourSeason(season) as Season,await cloudRead(`season-${season}`))
      for (const row of previous?.data || []) previousRows.set(String(row.id), row)
      const refreshed=await reconcileSeasonResults(season,year,previous,request)
      const fresh=refreshed.fresh,complete=refreshed.data
      detailCandidates.push(...complete)
      await cloudWrite(`season-${season}`,{data:complete,scope:refreshed.scope,at:refreshed.at})
      seasonsRefreshed.push(season)
      if(season===year){rows=fresh;data=complete}
    }
    const activity: ReturnType<typeof activityFixtures> = []
    let activityComplete=true
    for(const status of ['live','upcoming'] as const) for(const tour of ['atp','wta'] as const){
      const tiers=PROVIDER_PUBLICATION_TIERS[tour]
      const page=await request(`/matches?status=${status}&tour=${tour}&draw=singles&tier=${tiers}&limit=200`)
      if(!Array.isArray(page.data))throw new Error('Unexpected activity response')
      activity.push(...activityFixtures(page.data,status,tour))
      if(page.meta?.has_more)activityComplete=false
    }
    await cloudWrite('tour-activity',{checkedAt:new Date().toISOString(),fixtures:activity,complete:activityComplete})
    const { hasBundledDetail, bundledEnrichmentCandidates } = await import('./live-tennis')
    // Only keys are needed to avoid downloading the growing payload archive during sync.
    const known = new Set<string>()
    for(const key of await listArchiveKeys('detail-'))known.add(key.slice(7))
    let detailsAdded = 0,detailsRefreshed=0
    const overrides = new Set<string>((await cloudRead('detail-overrides'))?.keys || [])
    const checked:Record<string,string>=(await cloudRead('refresh-detail-state'))?.checked || {}
    const planned=detailRefreshPlan(detailCandidates as (ArchiveRow & {id:unknown})[],previousRows as Map<string,ArchiveRow & {id:unknown}>,id=>id.startsWith('wta-')?known.has(`wta-modern-${id.slice(4)}`):known.has(`modern-${id}`)||hasBundledDetail('modern',id),checked,Date.now(),row=>!hasClosedModernResult(row),row=>row.tour==='wta'?`wta-${row.id}`:String(row.id))
    for (const row of planned) {
      if (detailsAdded+detailsRefreshed >= 4 || calls >= callLimit-3 || remaining-calls<=wtaReserve+2 || Date.now() - started > 190_000) break
      const detailId=row.tour==='wta'?`wta-modern-${row.id}`:`modern-${row.id}`
      const existing=known.has(detailId)||(row.tour!=='wta'&&hasBundledDetail('modern',String(row.id)))
      const detail = await request(`/history/matches/${row.id}?points=complete`)
      if (!detail.match && !detail.stats) continue
      await cloudWrite(`detail-${detailId}`, detail)
      if(existing){detailsRefreshed++;overrides.add(`detail-${detailId}`)}else detailsAdded++
      known.add(detailId)
      checked[row.tour==='wta'?`wta-${row.id}`:String(row.id)]=new Date().toISOString()
    }
    await cloudWriteMany([{key:'detail-overrides',payload:{keys:[...overrides],at:new Date().toISOString()}},{key:'refresh-detail-state',payload:{checked}}])
    let historicalAdded=0,archiveRecentAdded=0
    const backfill=enrichmentPlan(await bundledEnrichmentCandidates(),known,2)
    for(const row of backfill){
      if(calls>=callLimit-1||remaining-calls<=wtaReserve+1||Date.now()-started>190_000)break
      const detail=await request(row.kind==='archive'?`/history/archive/matches/${row.id}`:`/history/matches/${row.id}?points=complete`)
      if(!detail.match&&!detail.stats)continue
      await cloudWrite(`detail-${row.kind}-${row.id}`,detail)
      known.add(`${row.kind}-${row.id}`)
      if(row.kind==='archive')historicalAdded++;else archiveRecentAdded++
    }
    cache.delete('detail-index')
    const result = { status: 'success', attemptAt, at: new Date().toISOString(), lastSuccessAt: new Date().toISOString(), year, matches: data.length, updated: rows.length, extracted:rows.length, enriched:detailsAdded+detailsRefreshed+historicalAdded+archiveRecentAdded, seasonsRefreshed, detailsAdded, detailsRefreshed, historicalAdded, archiveRecentAdded, calls, activityFixtures:activity.length, latestProviderDate:latestProviderResultDate(detailCandidates) }
    await cloudWrite('sync-status', withOperationHistory(priorStatus,result))
    return result
  } catch (error) {
    if(error instanceof TennisProviderError&&error.status===429){
      const result={status:'quota-reserve',phase:'current-season',attemptAt,at:new Date().toISOString(),remaining:providerRemainingCalls(quota),calls,extracted:0,lastSuccessAt,retryAt:error.retryAt||providerQuotaRetryAt(error.payload||quota),probe:{usage:quota?'ok':'unknown',currentSeason:'rate-limited'},message:error.message}
      await cloudWrite('sync-status',withOperationHistory(priorStatus,result));return result
    }
    await cloudWrite('sync-status', withOperationHistory(priorStatus,{ status: 'error', attemptAt, at: new Date().toISOString(), lastSuccessAt, calls, message: error instanceof Error ? error.message : 'Sync failed' }))
    throw error
  } finally { await release() }
}

/** Current WTA results are refreshed independently from all historical work. */
export async function refreshCloudWta() {
  const release=await lease()
  if(!release)return {status:'busy'}
  const started=Date.now(),attemptAt=new Date(started).toISOString()
  let calls=0,quota:ArchiveRow|undefined
  const priorStatus=await cloudRead('wta-sync-status').catch(()=>undefined)
  const lastSuccessAt=priorStatus?.status==='success'?priorStatus.at:priorStatus?.lastSuccessAt
  const save=(result:ArchiveRow)=>cloudWrite('wta-sync-status',withOperationHistory(priorStatus,result))
  try{
    await save({status:'running',phase:'current-season',at:attemptAt,attemptAt,lastSuccessAt})
    const capacity=await cloudArchiveHasCapacity()
    if(!capacity.available){
      const result={status:capacity.status==='full'?'storage-reserve':'storage-unverified',phase:'current-season',attemptAt,lastSuccessAt,at:new Date().toISOString(),calls,relationBytes:capacity.report?.relationBytes,maximumBytes:capacity.maximum}
      await save(result);return result
    }
    calls++;quota=await provider('/usage')
    const remaining=providerRemainingCalls(quota)
    if(!providerHasRequestAfterUsage(quota)){
      const result={status:'quota-reserve',phase:'current-season',attemptAt,at:new Date().toISOString(),remaining,calls,extracted:0,lastSuccessAt,retryAt:providerQuotaRetryAt(quota),probe:{usage:'ok',currentSeason:'deferred'}}
      await save(result);return result
    }
    const callLimit=Math.min(30,remaining)
    const request=async(path:string)=>{
      if(calls>=callLimit||Date.now()-started>220_000)throw new Error('WTA current sync safety budget reached')
      await new Promise(resolve=>setTimeout(resolve,1300));calls++;return provider(path)
    }
    const year=new Date().getUTCFullYear()
    const {bundledTourSeason}=await import('./live-tennis')
    const previous=mergeSeasonBaseline(await bundledTourSeason(year,'wta') as Season,await cloudRead(`season-wta-${year}`),'wta')
    const progressKey=`wta-current-progress-${year}`
    const refreshed=await reconcileSeasonResults(year,year,previous,request,'wta',{
      resume:await cloudRead(progressKey),save:checkpoint=>cloudWrite(progressKey,checkpoint),
    })
    const data:ArchiveRow[]=refreshed.data.map(row=>({...row,tour:'wta'}))
    const at=new Date().toISOString()
    await cloudWrite(`season-wta-${year}`,{data,scope:refreshed.scope,at:refreshed.at})
    const priorSeason=mergeSeasonBaseline(await bundledTourSeason(year-1,'wta') as Season,await cloudRead(`season-wta-${year-1}`),'wta')
    const providerRows=[...data,...(priorSeason?.data||[])]
    const result={status:'success',phase:'current-season',attemptAt,lastSuccessAt:at,at,calls,year,seasonsRefreshed:[year],seasonMatches:data.length,updated:refreshed.fresh.length,extracted:refreshed.fresh.length,latestProviderDate:latestProviderResultDate(providerRows),probe:{usage:'ok',currentSeason:'ok'}}
    await save(result);return result
  }catch(error){
    if(error instanceof TennisProviderError&&error.status===429){
      const result={status:'quota-reserve',phase:'current-season',attemptAt,at:new Date().toISOString(),remaining:providerRemainingCalls(quota),calls,extracted:0,lastSuccessAt,retryAt:error.retryAt||providerQuotaRetryAt(error.payload||quota),probe:{usage:quota?'ok':'unknown',currentSeason:'rate-limited'},message:error.message}
      await save(result);return result
    }
    const result={status:'error',phase:'current-season',attemptAt,at:new Date().toISOString(),calls,lastSuccessAt,message:error instanceof Error?error.message:'WTA current sync failed'}
    await save(result);throw error
  }finally{await release()}
}

/** Historical WTA expansion is optional and can never gate daily publication. */
export async function backfillCloudWtaHistory() {
  const release=await lease()
  if(!release)return {status:'busy'}
  const started=Date.now(),attemptAt=new Date(started).toISOString()
  let calls=0,quota:ArchiveRow|undefined
  const priorStatus=await cloudRead('wta-backfill-status').catch(()=>undefined)
  const lastSuccessAt=priorStatus?.status==='success'?priorStatus.at:priorStatus?.lastSuccessAt
  let cycle:ReturnType<typeof wtaBackfillCycle>|undefined
  const save=(result:ArchiveRow)=>cloudWrite('wta-backfill-status',withOperationHistory(priorStatus,{
    ...result,
    ...(cycle?.status==='ready'?{publicationCycle:cycle.publicationCycle,backfillDay:cycle.backfillDay}:{}),
  }))
  try{
    const [atpRefresh,wtaRefresh,publication]=await Promise.all([
      cloudRead('sync-status'),cloudRead('wta-sync-status'),cloudRead('publish-status'),
    ])
    cycle=wtaBackfillCycle(atpRefresh,wtaRefresh,publication,priorStatus)
    if(cycle.status==='already-attempted')return {status:'already-attempted',phase:'historical-backfill',publicationCycle:cycle.publicationCycle,backfillDay:cycle.backfillDay,calls:0}
    if(cycle.status==='waiting-current-publication'){
      const result={status:cycle.status,phase:'historical-backfill',attemptAt,at:attemptAt,lastSuccessAt,calls:0,reason:cycle.reason,publicationCycle:priorStatus?.publicationCycle,backfillDay:priorStatus?.backfillDay,probe:{history:'waiting-current-publication'}}
      await cloudWrite('wta-backfill-status',withOperationHistory(priorStatus,result));return result
    }
    await save({status:'running',phase:'historical-backfill',at:attemptAt,attemptAt,lastSuccessAt})
    const capacity=await cloudArchiveHasCapacity()
    if(!capacity.available){
      const result={status:capacity.status==='full'?'storage-reserve':'storage-unverified',phase:'historical-backfill',attemptAt,lastSuccessAt,at:new Date().toISOString(),calls,relationBytes:capacity.report?.relationBytes,maximumBytes:capacity.maximum}
      await save(result);return result
    }
    const bundledArchive=await materializeBundledWtaArchive(cloudRead,cloudWrite)
    calls++;quota=await provider('/usage')
    const remaining=providerRemainingCalls(quota)
    if(!providerHasRequestAfterUsage(quota)){
      const result={status:'quota-reserve',phase:'historical-backfill',attemptAt,at:new Date().toISOString(),remaining,calls,extracted:0,lastSuccessAt,retryAt:providerQuotaRetryAt(quota),bundledArchive,probe:{usage:'ok',history:'deferred'}}
      await save(result);return result
    }
    const callLimit=Math.min(90,remaining)
    const request=async(path:string)=>{
      if(calls>=callLimit||Date.now()-started>220_000)throw new Error('WTA historical sync safety budget reached')
      await new Promise(resolve=>setTimeout(resolve,1300));calls++;return provider(path)
    }
    const year=new Date().getUTCFullYear()
    const state=await cloudRead('wta-season-state')||{}
    const completed=new Set<number>(Array.isArray(state.completed)?state.completed:[])
    const pending=Array.from({length:Math.max(0,year-2023)},(_,i)=>year-1-i).filter(season=>!completed.has(season))
    const seasonsRefreshed:number[]=[]
    let seasonMatches=0,modernUpdated=0
    for(const season of pending){
      if(calls>=Math.min(callLimit,65)||Date.now()-started>155_000)break
      const key=`season-wta-${season}`,progressKey=`wta-season-progress-${season}`
      const {bundledTourSeason}=await import('./live-tennis')
      const previous=mergeSeasonBaseline(await bundledTourSeason(season,'wta') as Season,await cloudRead(key),'wta')
      const refreshed=await reconcileSeasonResults(season,year,previous,request,'wta',{resume:await cloudRead(progressKey),save:checkpoint=>cloudWrite(progressKey,checkpoint)})
      const data:ArchiveRow[]=refreshed.data.map(row=>({...row,tour:'wta'}))
      await cloudWrite(key,{data,scope:refreshed.scope,at:refreshed.at})
      seasonsRefreshed.push(season);seasonMatches+=data.length;modernUpdated+=refreshed.fresh.length
      completed.add(season);await cloudWrite('wta-season-state',{completed:[...completed],at:new Date().toISOString()})
    }
    const archiveIndex=await cloudRead('wta-archive-index')||{}
    const complete=new Set<string>(Array.isArray(archiveIndex.complete)?archiveIndex.complete:[])
    let historicalAdded=0,archivePages=0
    for(const {season,level,id} of wtaHistoricalCohortPlan(complete)){
      if(archivePages>=40||calls>=callLimit||Date.now()-started>200_000)break
      const key=`archive-wta-${id}`,saved=await cloudRead(key)
      const found=new Map<string,ArchiveRow>((saved?.data||[]).map((row:ArchiveRow)=>[String(row.id),row]))
      let offset=Number(saved?.nextOffset)||0,finished=false
      while(archivePages<40&&calls<callLimit&&Date.now()-started<200_000){
        const page=await request(`/history/archive/matches?tour=wta&level=${level}&from=${season}-01-01&to=${season}-12-31&limit=200&offset=${offset}`)
        if(!Array.isArray(page.data)||!page.meta||typeof page.meta.has_more!=='boolean')throw new Error('Unexpected WTA archive response')
        for(const row of page.data){if(row.tour&&row.tour!=='wta')throw new Error('Provider returned another circuit in WTA backfill');found.set(String(row.id),{...row,tour:'wta'})}
        const step=Number(page.meta.limit);if(!Number.isSafeInteger(step)||step<=0)throw new Error('Invalid WTA archive pagination')
        offset+=step;archivePages++;finished=!page.meta.has_more
        await cloudWrite(key,{data:[...found.values()],nextOffset:offset,complete:finished,at:new Date().toISOString()})
        if(finished)break
      }
      if(finished){complete.add(id);historicalAdded+=found.size;await cloudWrite('wta-archive-index',{complete:[...complete],at:new Date().toISOString()})}
    }
    const expectedHistorical=new Set(wtaHistoricalCohortIds())
    const pendingModern=Math.max(0,pending.length-seasonsRefreshed.length),historicalCohorts=[...complete].filter(id=>expectedHistorical.has(id)).length
    const totalHistoricalCohorts=WTA_HISTORICAL_COHORTS,finished=pendingModern===0&&historicalCohorts>=totalHistoricalCohorts,at=new Date().toISOString()
    const result={status:finished?'success':'backfill-progress',phase:'historical-backfill',attemptAt,lastSuccessAt:finished?at:lastSuccessAt,at,calls,seasonsRefreshed,seasonMatches,updated:modernUpdated,extracted:modernUpdated+historicalAdded,historicalAdded,archivePages,historicalCohorts,pendingModern,totalHistoricalCohorts,bundledArchive,probe:{usage:'ok',history:'ok'}}
    await save(result);return result
  }catch(error){
    if(error instanceof TennisProviderError&&isProviderFreeHistoryLimit(error.status,error.payload)){
      const result={status:'free-history-limit',phase:'historical-backfill',attemptAt,at:new Date().toISOString(),calls,extracted:0,lastSuccessAt,retryAt:providerQuotaRetryAt(error.payload||quota),probe:{usage:quota?'ok':'unknown',history:'plan-limit'},message:error.message}
      await save(result);return result
    }
    if(error instanceof TennisProviderError&&error.status===429){
      const result={status:'quota-reserve',phase:'historical-backfill',attemptAt,at:new Date().toISOString(),remaining:providerRemainingCalls(quota),calls,extracted:0,lastSuccessAt,retryAt:error.retryAt||providerQuotaRetryAt(error.payload||quota),probe:{usage:quota?'ok':'unknown',history:'rate-limited'},message:error.message}
      await save(result);return result
    }
    const result={status:'error',phase:'historical-backfill',attemptAt,at:new Date().toISOString(),calls,lastSuccessAt,message:error instanceof Error?error.message:'WTA historical sync failed'}
    await save(result);throw error
  }finally{await release()}
}

/** Health checks must not spend a Blob list operation on every poll. */
export async function cloudArchiveLastCapacity(budget=1_500){
  const saved=await cloudProbeRead('storage-capacity-status',budget);
  if(saved?.report&&Date.now()-Date.parse(saved.checkedAt)<36*3600000)return saved as {report:ArchiveStorageReport;maximum:number;status:ArchiveCapacityStatus;available:boolean;checkedAt:string};
  if(archiveStoreBackend()==='filesystem')return {...await cloudArchiveHasCapacity(budget),checkedAt:new Date().toISOString()};
  const maximum=archiveStoreBackend()==='filesystem'?150_000_000_000:800_000_000;
  return {report:undefined,maximum,status:'unknown' as ArchiveCapacityStatus,available:false,checkedAt:undefined};
}
