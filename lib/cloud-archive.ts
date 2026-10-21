import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { loadMissingDetails } from './archive-detail-batches'
import { enrichmentPlan } from './enrichment-plan'
import { activityFixtures } from './tour-activity'
import { detailRefreshPlan } from './detail-refresh-plan'

export type ArchiveRow = Record<string, any>
const base = 'https://api.livetennisapi.com/api/public/v1'
let clientInstance: SupabaseClient | null = null
export function cloudClient() {
  if (clientInstance) return clientInstance
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY
  if (url && key) clientInstance = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return clientInstance
}
const cache = new Map<string, { at: number; value: Promise<any> }>()
export async function cloudRead(key: string): Promise<any> {
  const client = cloudClient()
  if (!client) return undefined
  const saved = cache.get(key)
  if (saved && Date.now() - saved.at < 300_000) return saved.value
  const pending: { value?: Promise<any> } = {}
  pending.value = (async () => {
    let failure: { code: string; status: number } | undefined
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data, error, status } = await client.from('deuce_archive_objects').select('payload').eq('key', key).abortSignal(AbortSignal.timeout(15_000)).maybeSingle()
        if (!error) return data?.payload
        failure = { code: error.code || 'UNKNOWN', status }
        if (error.code !== 'PGRST303' || attempt === 1) break
        await new Promise(resolve => setTimeout(resolve, 150))
      } catch {
        failure = { code: 'NETWORK', status: 0 }
        break
      }
    }
    console.error('Cloud archive read failed:', failure?.code, failure?.status)
    // An authentication or network error is not a missing object. Let the next
    // request try again instead of caching an empty result for five minutes.
    if (cache.get(key)?.value === pending.value) cache.delete(key)
    return undefined
  })()
  cache.set(key, { at: Date.now(), value: pending.value })
  return pending.value
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
    throw new Error(`Archive write failed: ${error.code || status}`)
  }
}
export async function cloudWrite(key: string, payload: unknown) {
  await cloudWriteMany([{ key, payload }])
}
export async function cloudDetails(): Promise<Record<string, ArchiveRow>> {
  const client = cloudClient()
  if (!client) return {}
  const saved = cache.get('detail-index')
  if (saved && Date.now() - saved.at < 300_000) return saved.value
  const value = (async () => {
    const keys: string[] = []
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.from('deuce_archive_objects').select('key').like('key', 'detail-%').order('key').range(offset, offset + 999).abortSignal(AbortSignal.timeout(15_000))
      if (error) throw new Error(`Cloud detail index failed: ${error.code}`)
      for (const row of data || []) if(/^detail-(modern|archive)-/.test(row.key))keys.push(row.key)
      if (!data || data.length < 1000) break
    }
    const files = await readdir(join(process.cwd(), 'data', 'archive', 'details')).catch(() => [])
    const bundled = new Set(files.filter(f => f.endsWith('.json.gz')).map(f => `detail-${f.slice(0, -8)}`))
    const overrides = await cloudRead('detail-overrides')
    for(const key of overrides?.keys || []) if(typeof key==='string')bundled.delete(key)
    return loadMissingDetails<ArchiveRow>(keys, bundled, async batch => {
      const { data, error } = await client.from('deuce_archive_objects').select('key,payload').in('key', batch).abortSignal(AbortSignal.timeout(15_000))
      if (error) throw new Error(`Cloud detail batch failed: ${error.code}`)
      return data || []
    })
  })().catch(error => { cache.delete('detail-index'); console.error(error instanceof Error ? error.message : 'Cloud details read failed'); return {} })
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
  const response = await fetch(`${base}${path}`, { headers: { 'X-API-Key': process.env.TENNIS_API_KEY }, cache: 'no-store', signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`Tennis provider HTTP ${response.status}`)
  return response.json()
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
    const quota = await provider('/usage')
    const remaining = Number(quota.today?.remaining_day || 0)
    if (remaining < 120) {
      const result = { status: 'quota-reserve', at: new Date().toISOString(), remaining }
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
    const last = old?.at ? new Date(old.at).getTime() : 0
    const from = last && old?.scope === 'atp-main-v1'
      ? new Date(Math.max(Date.UTC(year, 0, 1), last - 7 * 86400000)).toISOString().slice(0, 10)
      : `${year}-01-01`
    const rows: ArchiveRow[] = []
    let offset = 0
    for (;;) {
      const page = await request(`/history/matches?tour=atp&draw=singles&tier=grand_slam,atp_1000,atp_500,atp_250&from=${from}&to=${year}-12-31&limit=200&offset=${offset}`)
      if (!Array.isArray(page.data) || !page.meta) throw new Error('Unexpected tennis list response')
      rows.push(...page.data)
      if (!page.meta.has_more) break
      const step = Number(page.meta.limit)
      if (!Number.isFinite(step) || step <= 0) throw new Error('Invalid pagination from provider')
      offset += step
    }
    const merged = new Map<string, ArchiveRow>((old?.data || []).map((row: ArchiveRow) => [String(row.id), row]))
    for (const row of rows) merged.set(String(row.id), row)
    const data = [...merged.values()]
    // Publish only a complete set of pages; keep the prior snapshot if any request fails.
    await cloudWrite(`season-${year}`, { data, scope: 'atp-main-v1', at: new Date().toISOString() })
    const activity: ReturnType<typeof activityFixtures> = []
    let activityComplete=true
    for(const status of ['live','upcoming'] as const){
      const page=await request(`/matches?status=${status}&tour=atp&draw=singles&tier=grand_slam,atp_1000,atp_500,atp_250&limit=200`)
      if(!Array.isArray(page.data))throw new Error('Unexpected activity response')
      activity.push(...activityFixtures(page.data,status))
      if(page.meta?.has_more)activityComplete=false
    }
    await cloudWrite('tour-activity',{checkedAt:new Date().toISOString(),fixtures:activity,complete:activityComplete})
    const { hasBundledDetail, bundledEnrichmentCandidates } = await import('./live-tennis')
    // Only keys are needed to avoid downloading the growing payload archive during sync.
    const known = new Set<string>()
    for(let offset=0;;offset+=1000){
      const {data:keys,error}=await cloudClient()!.from('deuce_archive_objects').select('key').like('key','detail-%').order('key').range(offset,offset+999)
      if(error)throw new Error(`Archive keys read failed: ${error.code}`)
      for(const row of keys||[])known.add(row.key.slice(7))
      if(!keys||keys.length<1000)break
    }
    let detailsAdded = 0,detailsRefreshed=0
    const overrides = new Set<string>((await cloudRead('detail-overrides'))?.keys || [])
    const previousRows=new Map<string,ArchiveRow>((old?.data||[]).map((r:ArchiveRow)=>[String(r.id),r]))
    const checked:Record<string,string>=(await cloudRead('refresh-detail-state'))?.checked || {}
    const planned=detailRefreshPlan(data as (ArchiveRow & {id:unknown})[],previousRows as Map<string,ArchiveRow & {id:unknown}>,id=>known.has(`modern-${id}`)||hasBundledDetail('modern',id),checked)
    for (const row of planned) {
      if (detailsAdded+detailsRefreshed >= 24 || calls >= 50 || Date.now() - started > 190_000) break
      const existing=known.has(`modern-${row.id}`)||hasBundledDetail('modern',String(row.id))
      const detail = await request(`/history/matches/${row.id}?points=complete`)
      if (!detail.match && !detail.stats) continue
      await cloudWrite(`detail-modern-${row.id}`, detail)
      if(existing){detailsRefreshed++;overrides.add(`detail-modern-${row.id}`)}else detailsAdded++
      known.add(`modern-${row.id}`)
      checked[String(row.id)]=new Date().toISOString()
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
    const result = { status: 'success', at: new Date().toISOString(), year, matches: data.length, updated: rows.length, detailsAdded, detailsRefreshed, historicalAdded, archiveRecentAdded, calls, activityFixtures:activity.length }
    await cloudWrite('sync-status', result)
    return result
  } catch (error) {
    await cloudWrite('sync-status', { status: 'error', at: new Date().toISOString(), calls, message: error instanceof Error ? error.message : 'Sync failed' })
    throw error
  } finally { await release() }
}
