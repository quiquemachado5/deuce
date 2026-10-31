import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { loadMissingDetails } from './archive-detail-batches'
import { archiveGet, archiveReadFailure } from './archive-get'
import { enrichmentPlan } from './enrichment-plan'
import { activityFixtures } from './tour-activity'
import {reconcileSeasonResults} from './result-refresh'
import { detailRefreshPlan } from './detail-refresh-plan'
import { hasClosedModernResult } from './modern-result'

// Provider payloads are schemaless until they are normalized into Match.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ArchiveRow = Record<string, any>
const base = 'https://api.livetennisapi.com/api/public/v1'
let clientInstance: SupabaseClient | null = null
export function cloudClient() {
  if (clientInstance) return clientInstance
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY
  if (url && key) clientInstance = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return clientInstance
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cache stores heterogeneous archive JSON.
const cache = new Map<string, { at: number; value: Promise<any> }>()
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- callers validate each object contract.
export async function cloudRead(key: string): Promise<any> {
  const client = cloudClient()
  if (!client) return undefined
  const saved = cache.get(key)
  if (saved && Date.now() - saved.at < 300_000) return saved.value
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see cloudRead contract above.
  const pending: { value?: Promise<any> } = {}
  pending.value = (async () => {
    try {
      const data = await archiveGet(signal => client.from('deuce_archive_objects').select('payload').eq('key', key).abortSignal(signal).maybeSingle().retry(false))
      return data?.payload
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

/** Read one immutable artifact from a published records generation. */
export async function cloudSnapshotBlob<T>(version: string, id: string): Promise<T | undefined> {
  const key = `reading-v2-${version}-${id}`
  const index = await cloudRead(key)
  if (!index || typeof index !== 'object') return undefined
  try {
    let encoded: string
    if (typeof index.gzip === 'string') encoded = index.gzip
    else {
      const chunks = Number(index.chunks)
      if (index.encoding !== 'gzip-chunks' || !Number.isInteger(chunks) || chunks < 1 || chunks > 256) return undefined
      const parts = await Promise.all(Array.from({ length: chunks }, (_, part) => cloudRead(`${key}-chunk${part}`)))
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
  const client = cloudClient()
  if (!client) throw new Error('Cloud archive is not configured')
  const rows = entries.map(entry => ({ ...entry, updated_at: new Date().toISOString() }))
  for (let attempt = 0; attempt < 2; attempt++) {
    let result
    try {
      result = await client.from('deuce_archive_objects').upsert(rows).abortSignal(AbortSignal.timeout(15_000))
    } catch (error) {
      if (attempt === 0 && error instanceof Error && ['AbortError', 'TimeoutError', 'TypeError'].includes(error.name)) continue
      throw error
    }
    const { error, status } = result
    if (!error) {
      for (const { key } of entries) cache.delete(key)
      return
    }
    if (attempt === 0 && (error.code === '57014' || status === 0 || status === 429 || status >= 500)) continue
    // Object keys and size identify the failed stage without exposing payloads.
    throw new Error(`Archive write failed: ${error.code || status}; keys=${entries.map(entry => entry.key).join(',')}; bytes=${Buffer.byteLength(JSON.stringify(rows))}`)
  }
}
export async function cloudWrite(key: string, payload: unknown) {
  await cloudWriteMany([{ key, payload }])
}
export type ArchiveStorageReport={relationBytes:number;payloadBytes:number;objects:number;snapshots:number;details:number};
export async function cloudArchiveStorageReport():Promise<ArchiveStorageReport|undefined>{
  const client=cloudClient();if(!client)return undefined;
  const {data,error}=await client.rpc('deuce_archive_storage_report').abortSignal(AbortSignal.timeout(5_000));
  if(error||!Array.isArray(data)||!data[0])return undefined;
  const row=data[0] as Record<string,unknown>;
  const number=(key:string)=>Number(row[key])||0;
  return {relationBytes:number('relation_bytes'),payloadBytes:number('payload_bytes'),objects:number('object_count'),snapshots:number('snapshot_count'),details:number('detail_count')};
}
export async function cloudArchiveHasCapacity(){
  const report=await cloudArchiveStorageReport();
  const configured=Number(process.env.DEUCE_ARCHIVE_MAX_BYTES),maximum=Number.isFinite(configured)&&configured>0?configured:1_500_000_000;
  return {report,maximum,available:!report||report.relationBytes<maximum};
}

/** Keep the active and immediately previous immutable generations only. */
export async function cloudPruneSnapshotGenerations(keepVersions:readonly string[]){
  const client=cloudClient();if(!client)return 0;
  const keep=new Set(keepVersions.filter(version=>/^[a-f0-9]{20}$/.test(version))),obsolete:string[]=[];
  for(let offset=0;;offset+=1000){
    const {data,error}=await client.from('deuce_archive_objects').select('key').like('key','reading-v2-%').order('key').range(offset,offset+999).abortSignal(AbortSignal.timeout(10_000));
    if(error)throw error;
    for(const row of data||[]){const version=/^reading-v2-([a-f0-9]{20})-/.exec(row.key)?.[1];if(version&&!keep.has(version))obsolete.push(row.key);}
    if(!data||data.length<1000)break;
  }
  for(let offset=0;offset<obsolete.length;offset+=250){
    const {error}=await client.from('deuce_archive_objects').delete().in('key',obsolete.slice(offset,offset+250)).abortSignal(AbortSignal.timeout(15_000));
    if(error)throw error;
  }
  return obsolete.length;
}
export async function cloudDetails(): Promise<Record<string, ArchiveRow>> {
  const client = cloudClient()
  if (!client) return {}
  const saved = cache.get('detail-index')
  if (saved && Date.now() - saved.at < 300_000) return saved.value
  const value = (async () => {
    const keys: string[] = []
    for (let offset = 0; ; offset += 1000) {
      const data = await archiveGet(signal => client.from('deuce_archive_objects').select('key').like('key', 'detail-%').order('key').range(offset, offset + 999).abortSignal(signal).retry(false))
      for (const row of data || []) if(/^detail-(?:wta-)?(modern|archive)-/.test(row.key))keys.push(row.key)
      if (!data || data.length < 1000) break
    }
    const files = await readdir(join(process.cwd(), 'data', 'archive', 'details')).catch(() => [])
    const bundled = new Set(files.filter(f => f.endsWith('.json.gz')).map(f => `detail-${f.slice(0, -8)}`))
    const overrides = await cloudRead('detail-overrides')
    for(const key of overrides?.keys || []) if(typeof key==='string')bundled.delete(key)
    return loadMissingDetails<ArchiveRow>(keys, bundled, async batch => {
      const data = await archiveGet(signal => client.from('deuce_archive_objects').select('key,payload').in('key', batch).abortSignal(signal).retry(false))
      return data || []
    })
  })().catch(error => { cache.delete('detail-index'); console.error('Cloud details read failed:', archiveReadFailure(error)); return {} })
  cache.set('detail-index', { at: Date.now(), value })
  return value
}
async function lease() {
  const client = cloudClient()
  if (!client) throw new Error('Cloud archive is not configured')
  const owner = randomUUID()
  const { data, error } = await client.rpc('deuce_acquire_lease', { lease_name: 'tennis-provider', lease_owner: owner, ttl_seconds: 300 })
  if (error) throw new Error(`Sync lease failed: ${error.code}`)
  if (!data) return null
  return async () => {
    await client.from('deuce_sync_lease').update({ expires_at: new Date(Date.now() + 1500).toISOString() }).eq('name', 'tennis-provider').eq('owner', owner)
  }
}
async function provider(path: string) {
  if (!process.env.TENNIS_API_KEY) throw new Error('Tennis provider is not configured')
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`${base}${path}`, { headers: { 'X-API-Key': process.env.TENNIS_API_KEY }, cache: 'no-store', signal: AbortSignal.timeout(20_000) })
      if (response.ok) return response.json()
      if (response.status !== 429 && response.status < 500) throw new Error(`Tennis provider HTTP ${response.status}`)
      lastError = new Error(`Tennis provider HTTP ${response.status}`)
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
  if (!process.env.TENNIS_API_KEY || !cloudClient()) return undefined
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
  try {
    const capacity=await cloudArchiveHasCapacity()
    if(!capacity.available){
      const result={status:'storage-reserve',at:new Date().toISOString(),calls,relationBytes:capacity.report?.relationBytes,maximumBytes:capacity.maximum}
      await cloudWrite('sync-status',result)
      return result
    }
    const quota = await provider('/usage')
    const remaining = Number(quota.today?.remaining_day || 0)
    if (remaining < 120) {
      const previous = await cloudRead('sync-status')
      const result = { status: 'quota-reserve', at: new Date().toISOString(), remaining, lastSuccessAt: previous?.status === 'success' ? previous.at : previous?.lastSuccessAt }
      await cloudWrite('sync-status', result)
      return result
    }
    const request = async (path: string) => {
      if (calls >= 96 || remaining - calls <= 100 || Date.now() - started > 220_000) throw new Error('Sync safety budget reached')
      await new Promise(resolve => setTimeout(resolve, 1300))
      calls++
      return provider(path)
    }
    const year = new Date().getUTCFullYear()
    const old = await cloudRead(`season-${year}`)
    const seasonsRefreshed:number[]=[]
    const detailCandidates:ArchiveRow[]=[]
    const previousRows=new Map<string,ArchiveRow>()
    let rows:ArchiveRow[]=[],data:ArchiveRow[]=[]
    // Migrate every saved modern season once. Afterwards, poll result restatements
    // across all years as well as the current fixture window.
    for(const season of [year,...Array.from({length:Math.max(0,year-2023)},(_,i)=>2023+i)]){
      const previous=season===year?old:await cloudRead(`season-${season}`)
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
      const tiers=tour==='atp'?'grand_slam,atp_1000,atp_500,atp_250':'grand_slam,wta_1000,wta_500,wta_250,wta_125'
      const page=await request(`/matches?status=${status}&tour=${tour}&draw=singles&tier=${tiers}&limit=200`)
      if(!Array.isArray(page.data))throw new Error('Unexpected activity response')
      activity.push(...activityFixtures(page.data,status,tour))
      if(page.meta?.has_more)activityComplete=false
    }
    await cloudWrite('tour-activity',{checkedAt:new Date().toISOString(),fixtures:activity,complete:activityComplete})
    const { hasBundledDetail, bundledEnrichmentCandidates } = await import('./live-tennis')
    // Only keys are needed to avoid downloading the growing payload archive during sync.
    const known = new Set<string>()
    for(let offset=0;;offset+=1000){
      const keys=await archiveGet(signal=>cloudClient()!.from('deuce_archive_objects').select('key').like('key','detail-%').order('key').range(offset,offset+999).abortSignal(signal).retry(false))
      for(const row of keys||[])known.add(row.key.slice(7))
      if(!keys||keys.length<1000)break
    }
    let detailsAdded = 0,detailsRefreshed=0
    const overrides = new Set<string>((await cloudRead('detail-overrides'))?.keys || [])
    const checked:Record<string,string>=(await cloudRead('refresh-detail-state'))?.checked || {}
    const planned=detailRefreshPlan(detailCandidates as (ArchiveRow & {id:unknown})[],previousRows as Map<string,ArchiveRow & {id:unknown}>,id=>id.startsWith('wta-')?known.has(`wta-modern-${id.slice(4)}`):known.has(`modern-${id}`)||hasBundledDetail('modern',id),checked,Date.now(),row=>!hasClosedModernResult(row),row=>row.tour==='wta'?`wta-${row.id}`:String(row.id))
    for (const row of planned) {
      if (detailsAdded+detailsRefreshed >= 24 || calls >= 88 || Date.now() - started > 190_000) break
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
    const backfill=enrichmentPlan(await bundledEnrichmentCandidates(),known,90)
    for(const row of backfill){
      if(calls>=95||remaining-calls<=101||Date.now()-started>190_000)break
      const detail=await request(row.kind==='archive'?`/history/archive/matches/${row.id}`:`/history/matches/${row.id}?points=complete`)
      if(!detail.match&&!detail.stats)continue
      await cloudWrite(`detail-${row.kind}-${row.id}`,detail)
      known.add(`${row.kind}-${row.id}`)
      if(row.kind==='archive')historicalAdded++;else archiveRecentAdded++
    }
    cache.delete('detail-index')
    const result = { status: 'success', at: new Date().toISOString(), lastSuccessAt: new Date().toISOString(), year, matches: data.length, updated: rows.length, seasonsRefreshed, detailsAdded, detailsRefreshed, historicalAdded, archiveRecentAdded, calls, activityFixtures:activity.length }
    await cloudWrite('sync-status', result)
    return result
  } catch (error) {
    const previous = await cloudRead('sync-status').catch(() => undefined)
    await cloudWrite('sync-status', { status: 'error', at: new Date().toISOString(), lastSuccessAt: previous?.status === 'success' ? previous.at : previous?.lastSuccessAt, calls, message: error instanceof Error ? error.message : 'Sync failed' })
    throw error
  } finally { await release() }
}

/** Independent WTA backfill with its own request budget and checkpoints. */
export async function refreshCloudWta() {
  const release = await lease()
  if (!release) return {status:'busy'}
  const started=Date.now()
  let calls=0
  try {
    const capacity=await cloudArchiveHasCapacity()
    if(!capacity.available){
      const result={status:'storage-reserve',at:new Date().toISOString(),calls,relationBytes:capacity.report?.relationBytes,maximumBytes:capacity.maximum}
      await cloudWrite('wta-sync-status',result)
      return result
    }
    const quota=await provider('/usage')
    const remaining=Number(quota.today?.remaining_day||0)
    if(remaining<35){
      const previous=await cloudRead('wta-sync-status').catch(()=>undefined)
      const result={status:'quota-reserve',at:new Date().toISOString(),remaining,calls,lastSuccessAt:previous?.status==='success'?previous.at:previous?.lastSuccessAt}
      await cloudWrite('wta-sync-status',result)
      return result
    }
    const request=async(path:string)=>{
      if(calls>=90||remaining-calls<=25||Date.now()-started>220_000)throw new Error('WTA sync safety budget reached')
      await new Promise(resolve=>setTimeout(resolve,1300))
      calls++
      return provider(path)
    }
    const year=new Date().getUTCFullYear()
    const state=await cloudRead('wta-season-state')||{}
    const completed=new Set<number>(Array.isArray(state.completed)?state.completed:[])
    const pending=Array.from({length:Math.max(0,year-2023)},(_,i)=>year-1-i).filter(season=>!completed.has(season))
    const seasonsRefreshed:number[]=[]
    let seasonMatches=0
    for(const season of [year,...pending]){
      if(calls>=65||remaining-calls<=45||Date.now()-started>160_000)break
      const key=`season-wta-${season}`
      const previous=await cloudRead(key)
      const refreshed=await reconcileSeasonResults(season,year,previous,request,'wta')
      const data=refreshed.data.map(row=>({...row,tour:'wta'}))
      await cloudWrite(key,{data,scope:refreshed.scope,at:refreshed.at})
      seasonsRefreshed.push(season)
      seasonMatches+=data.length
      if(season!==year){
        completed.add(season)
        await cloudWrite('wta-season-state',{completed:[...completed],at:new Date().toISOString()})
      }
    }
    // Publish a historical cohort only after all of its pages have arrived.
    const archiveIndex=await cloudRead('wta-archive-index')||{}
    const complete=new Set<string>(Array.isArray(archiveIndex.complete)?archiveIndex.complete:[])
    let historicalAdded=0,archivePages=0
    for(let season=2022;season>=1968&&archivePages<40;season--)for(const level of ['G','M','A']){
      const id=`${season}-${level}`
      if(complete.has(id)||calls>=88||remaining-calls<=27||Date.now()-started>200_000)continue
      const key=`archive-wta-${id}`
      const saved=await cloudRead(key)
      const found=new Map<string,ArchiveRow>((saved?.data||[]).map((row:ArchiveRow)=>[String(row.id),row]))
      let offset=Number(saved?.nextOffset)||0
      let finished=false
      while(archivePages<40&&calls<88&&remaining-calls>27&&Date.now()-started<200_000){
        const page=await request(`/history/archive/matches?tour=wta&level=${level}&from=${season}-01-01&to=${season}-12-31&limit=200&offset=${offset}`)
        if(!Array.isArray(page.data)||!page.meta)throw new Error('Unexpected WTA archive response')
        for(const row of page.data)found.set(String(row.id),{...row,tour:'wta'})
        const step=Number(page.meta.limit)
        if(!Number.isSafeInteger(step)||step<=0)throw new Error('Invalid WTA archive pagination')
        offset+=step
        archivePages++
        finished=!page.meta.has_more
        await cloudWrite(key,{data:[...found.values()],nextOffset:offset,complete:finished,at:new Date().toISOString()})
        if(finished)break
      }
      if(finished){
        complete.add(id)
        historicalAdded+=found.size
        await cloudWrite('wta-archive-index',{complete:[...complete],at:new Date().toISOString()})
      }
    }
    const result={status:seasonsRefreshed.length||archivePages?'success':'quota-reserve',at:new Date().toISOString(),calls,seasonsRefreshed,seasonMatches,historicalAdded,archivePages,historicalCohorts:complete.size}
    await cloudWrite('wta-sync-status',result)
    return result
  }catch(error){
    const previous=await cloudRead('wta-sync-status').catch(()=>undefined)
    const result={status:'error',at:new Date().toISOString(),calls,lastSuccessAt:previous?.status==='success'?previous.at:previous?.lastSuccessAt,message:error instanceof Error?error.message:'WTA sync failed'}
    await cloudWrite('wta-sync-status',result)
    throw error
  }finally{await release()}
}
