import 'server-only'

import {
  BlobPreconditionFailedError,
  del,
  get,
  list,
  put,
  type PutBlobResult,
} from '@vercel/blob'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

export type ArchiveStoreBackend = 'vercel-blob' | 'supabase' | null
export type ArchiveStoreEntry = { key: string; payload: unknown }
export type ArchiveStoreReport = {
  relationBytes: number
  payloadBytes: number
  objects: number
  snapshots: number
  details: number
}

const ROOT = 'deuce/archive/'
const KEY = /^[a-zA-Z0-9._:-]+$/
let legacyClient: SupabaseClient | null = null
let reportCache: { at: number; value: ArchiveStoreReport } | undefined

function validatedKey(key: string) {
  if (!KEY.test(key)) throw new Error(`Invalid archive key: ${key}`)
  return key
}

export function archiveBlobPath(key: string) {
  return `${ROOT}${validatedKey(key)}.json`
}

function keyFromBlobPath(pathname: string) {
  if (!pathname.startsWith(ROOT) || !pathname.endsWith('.json')) return undefined
  const key = pathname.slice(ROOT.length, -5)
  return KEY.test(key) ? key : undefined
}

export function archiveStoreBackend(env: Readonly<Record<string,string|undefined>> = process.env): ArchiveStoreBackend {
  if (env.BLOB_READ_WRITE_TOKEN || env.BLOB_STORE_ID) return 'vercel-blob'
  if (env.SUPABASE_URL && env.SUPABASE_SECRET_KEY) return 'supabase'
  return null
}

export function archiveStoreConfigured() {
  return archiveStoreBackend() !== null
}

export function legacyArchiveClient() {
  if (legacyClient) return legacyClient
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (url && key) legacyClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return legacyClient
}

async function blobJson(key: string, budget: number) {
  const result = await get(archiveBlobPath(key), {
    access: 'private',
    useCache: false,
    abortSignal: AbortSignal.timeout(Math.max(1, budget)),
  })
  if (!result || result.statusCode !== 200) return undefined
  return await new Response(result.stream).json()
}

export async function readArchiveObject(key: string, budget = 8_000): Promise<unknown> {
  const backend = archiveStoreBackend()
  if (backend === 'vercel-blob') {
    try { return await blobJson(key, budget) } catch { return undefined }
  }
  const client = legacyArchiveClient()
  if (!client) return undefined
  try {
    const { data, error } = await client.from('deuce_archive_objects').select('payload').eq('key', validatedKey(key))
      .abortSignal(AbortSignal.timeout(Math.max(1, budget))).maybeSingle()
    return error ? undefined : data?.payload
  } catch { return undefined }
}

async function putBlobEntry(entry: ArchiveStoreEntry, budget: number): Promise<PutBlobResult> {
  return put(archiveBlobPath(entry.key), JSON.stringify(entry.payload), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
    abortSignal: AbortSignal.timeout(Math.max(1, budget)),
  })
}

export async function writeArchiveObjects(entries: readonly ArchiveStoreEntry[], budget = 20_000) {
  if (!entries.length) return
  if (archiveStoreBackend() === 'vercel-blob') {
    const settled = await Promise.allSettled(entries.map(entry => putBlobEntry(entry, budget)))
    const failed = settled.find(result => result.status === 'rejected')
    if (failed?.status === 'rejected') throw failed.reason
    reportCache = undefined
    return
  }
  const client = legacyArchiveClient()
  if (!client) throw new Error('Cloud archive is not configured')
  const rows = entries.map(entry => ({ ...entry, updated_at: new Date().toISOString() }))
  const { error, status } = await client.from('deuce_archive_objects').upsert(rows)
    .abortSignal(AbortSignal.timeout(Math.max(1, budget)))
  if (error) throw new Error(`Archive write failed: ${error.code || status}`)
}

async function listBlobKeys(prefix: string, budget: number) {
  const keys: string[] = []
  let cursor: string | undefined
  do {
    const page = await list({
      prefix: archiveBlobPath(prefix).slice(0, -5),
      cursor,
      limit: 1000,
      abortSignal: AbortSignal.timeout(Math.max(1, budget)),
    })
    for (const blob of page.blobs) {
      const key = keyFromBlobPath(blob.pathname)
      if (key?.startsWith(prefix)) keys.push(key)
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return keys
}

export async function listArchiveKeys(prefix: string, budget = 10_000) {
  validatedKey(prefix)
  if (archiveStoreBackend() === 'vercel-blob') return listBlobKeys(prefix, budget)
  const client = legacyArchiveClient()
  if (!client) return []
  const keys: string[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from('deuce_archive_objects').select('key').like('key', `${prefix}%`)
      .order('key').range(offset, offset + 999).abortSignal(AbortSignal.timeout(Math.max(1, budget)))
    if (error) throw error
    for (const row of data || []) keys.push(row.key)
    if (!data || data.length < 1000) break
  }
  return keys
}

export async function deleteArchiveKeys(keys: readonly string[], budget = 15_000) {
  if (!keys.length) return
  if (archiveStoreBackend() === 'vercel-blob') {
    for (let offset = 0; offset < keys.length; offset += 250) {
      await del(keys.slice(offset, offset + 250).map(archiveBlobPath), {
        abortSignal: AbortSignal.timeout(Math.max(1, budget)),
      })
    }
    reportCache = undefined
    return
  }
  const client = legacyArchiveClient()
  if (!client) return
  for (let offset = 0; offset < keys.length; offset += 250) {
    const { error } = await client.from('deuce_archive_objects').delete().in('key', keys.slice(offset, offset + 250))
      .abortSignal(AbortSignal.timeout(Math.max(1, budget)))
    if (error) throw error
  }
}

export async function archiveStoreReport(budget = 10_000): Promise<ArchiveStoreReport | undefined> {
  if (archiveStoreBackend() === 'vercel-blob') {
    if (reportCache && Date.now() - reportCache.at < 900_000) return reportCache.value
    try {
      let cursor: string | undefined
      let bytes = 0, objects = 0, snapshots = 0, details = 0
      do {
        const page = await list({ prefix: ROOT, cursor, limit: 1000, abortSignal: AbortSignal.timeout(Math.max(1, budget)) })
        for (const blob of page.blobs) {
          const key = keyFromBlobPath(blob.pathname)
          if (!key) continue
          bytes += blob.size
          objects++
          if (key.startsWith('reading-v2-')) snapshots++
          if (key.startsWith('detail-')) details++
        }
        cursor = page.hasMore ? page.cursor : undefined
      } while (cursor)
      const value = { relationBytes: bytes, payloadBytes: bytes, objects, snapshots, details }
      reportCache = { at: Date.now(), value }
      return value
    } catch { return undefined }
  }
  const client = legacyArchiveClient()
  if (!client) return undefined
  try {
    const { data, error } = await client.rpc('deuce_archive_storage_report')
      .abortSignal(AbortSignal.timeout(Math.max(1, budget)))
    if (error || !Array.isArray(data) || !data[0]) return undefined
    const row = data[0] as Record<string, unknown>
    const number = (key: string) => Number(row[key]) || 0
    return {
      relationBytes: number('relation_bytes'), payloadBytes: number('payload_bytes'),
      objects: number('object_count'), snapshots: number('snapshot_count'), details: number('detail_count'),
    }
  } catch { return undefined }
}

type LeasePayload = { owner: string; expiresAt: string }

async function acquireBlobLease(name: string, ttlSeconds: number) {
  const path = archiveBlobPath(`lease-${name}`)
  const owner = randomUUID()
  const payload = (): LeasePayload => ({ owner, expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString() })
  let written: PutBlobResult
  try {
    const current = await get(path, { access: 'private', useCache: false, abortSignal: AbortSignal.timeout(5_000) })
    if (!current) {
      written = await put(path, JSON.stringify(payload()), {
        access: 'private', addRandomSuffix: false, allowOverwrite: false,
        contentType: 'application/json', cacheControlMaxAge: 60,
      })
    } else {
      if (current.statusCode !== 200) return null
      const lease = await new Response(current.stream).json() as Partial<LeasePayload>
      if (typeof lease.expiresAt === 'string' && Date.parse(lease.expiresAt) > Date.now()) return null
      written = await put(path, JSON.stringify(payload()), {
        access: 'private', addRandomSuffix: false, allowOverwrite: true, ifMatch: current.blob.etag,
        contentType: 'application/json', cacheControlMaxAge: 60,
      })
    }
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError) return null
    return null
  }
  return async () => {
    try { await del(path, { ifMatch: written.etag }) } catch { /* another invocation owns it */ }
  }
}

export async function acquireArchiveLease(name: string, ttlSeconds = 300) {
  if (archiveStoreBackend() === 'vercel-blob') return acquireBlobLease(validatedKey(name), Math.min(600, Math.max(1, ttlSeconds)))
  const client = legacyArchiveClient()
  if (!client) throw new Error('Cloud archive is not configured')
  const owner = randomUUID()
  const { data, error } = await client.rpc('deuce_acquire_lease', {
    lease_name: validatedKey(name), lease_owner: owner, ttl_seconds: Math.min(600, Math.max(1, ttlSeconds)),
  })
  if (error) throw new Error(`Sync lease failed: ${error.code}`)
  if (!data) return null
  return async () => {
    await client.from('deuce_sync_lease').update({ expires_at: new Date(Date.now() + 1500).toISOString() })
      .eq('name', name).eq('owner', owner)
  }
}
