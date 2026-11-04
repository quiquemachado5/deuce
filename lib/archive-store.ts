import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile, readdir, rename, stat, unlink } from 'node:fs/promises'
import { join } from 'node:path'

export type ArchiveStoreBackend = 'filesystem' | 'supabase' | null
export type ArchiveStoreEntry = { key: string; payload: unknown }
export type ArchiveStoreReport = {
  relationBytes: number
  payloadBytes: number
  objects: number
  snapshots: number
  details: number
}

const KEY = /^[a-zA-Z0-9._:-]+$/
let legacyClient: SupabaseClient | null = null
let reportCache: { at: number; value: ArchiveStoreReport } | undefined

function validatedKey(key: string) {
  if (!KEY.test(key)) throw new Error(`Invalid archive key: ${key}`)
  return key
}

export function archiveStoreBackend(env: Readonly<Record<string,string|undefined>> = process.env): ArchiveStoreBackend {
  if (env.DEUCE_ARCHIVE_DIR) return 'filesystem'
  if (env.SUPABASE_URL && env.SUPABASE_SECRET_KEY) return 'supabase'
  return null
}

function filesystemRoot() {
  const root = process.env.DEUCE_ARCHIVE_DIR
  if (!root) throw new Error('Filesystem archive is not configured')
  return root
}

function filesystemPath(key: string) {
  return join(filesystemRoot(), `${validatedKey(key)}.json`)
}

async function readFilesystemObject(key: string) {
  try { return JSON.parse(await readFile(filesystemPath(key), 'utf8')) as unknown }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

async function writeFilesystemObject(entry: ArchiveStoreEntry) {
  const root = filesystemRoot()
  await mkdir(root, { recursive: true, mode: 0o700 })
  const destination = filesystemPath(entry.key)
  const temporary = join(root, `.${validatedKey(entry.key)}.${randomUUID()}.tmp`)
  const handle = await open(temporary, 'wx', 0o600)
  try { await handle.writeFile(JSON.stringify(entry.payload)); await handle.sync() }
  finally { await handle.close() }
  await rename(temporary, destination)
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

export async function readArchiveObject(key: string, budget = 8_000): Promise<unknown> {
  const backend = archiveStoreBackend()
  if (backend === 'filesystem') return readFilesystemObject(key)
  const client = legacyArchiveClient()
  if (!client) return undefined
  try {
    const { data, error } = await client.from('deuce_archive_objects').select('payload').eq('key', validatedKey(key))
      .abortSignal(AbortSignal.timeout(Math.max(1, budget))).maybeSingle()
    return error ? undefined : data?.payload
  } catch { return undefined }
}

export async function writeArchiveObjects(entries: readonly ArchiveStoreEntry[], budget = 20_000) {
  if (!entries.length) return
  const unique = [...new Map(entries.map(entry => [entry.key, entry])).values()]
  if (archiveStoreBackend() === 'filesystem') {
    await Promise.all(unique.map(writeFilesystemObject))
    reportCache = undefined
    return
  }
  const client = legacyArchiveClient()
  if (!client) throw new Error('Cloud archive is not configured')
  const rows = unique.map(entry => ({ ...entry, updated_at: new Date().toISOString() }))
  const { error, status } = await client.from('deuce_archive_objects').upsert(rows)
    .abortSignal(AbortSignal.timeout(Math.max(1, budget)))
  if (error) throw new Error(`Archive write failed: ${error.code || status}`)
}

export async function listArchiveKeys(prefix: string, budget = 10_000) {
  if (prefix) validatedKey(prefix)
  if (archiveStoreBackend() === 'filesystem') {
    const files = await readdir(filesystemRoot()).catch(error => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    })
    return files.filter(file => file.endsWith('.json') && file.slice(0, -5).startsWith(prefix))
      .map(file => file.slice(0, -5)).filter(key => KEY.test(key)).sort()
  }
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
  if (archiveStoreBackend() === 'filesystem') {
    await Promise.all(keys.map(key => unlink(filesystemPath(key)).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    })))
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
  if (archiveStoreBackend() === 'filesystem') {
    if (reportCache && Date.now() - reportCache.at < 60_000) return reportCache.value
    const keys = await listArchiveKeys('')
    let bytes = 0, snapshots = 0, details = 0
    for (const key of keys) {
      bytes += (await stat(filesystemPath(key))).size
      if (key.startsWith('reading-v2-')) snapshots++
      if (key.startsWith('detail-')) details++
    }
    const value = { relationBytes: bytes, payloadBytes: bytes, objects: keys.length, snapshots, details }
    reportCache = { at: Date.now(), value }
    return value
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

async function acquireFilesystemLease(name: string, ttlSeconds: number) {
  const root = filesystemRoot()
  await mkdir(root, { recursive: true, mode: 0o700 })
  const path = join(root, `.lease-${validatedKey(name)}.lock`)
  const owner = randomUUID()
  const payload = (): LeasePayload => ({ owner, expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString() })
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const handle = await open(path, 'wx', 0o600)
      await handle.writeFile(JSON.stringify(payload()))
      await handle.close()
      let renewal = Promise.resolve()
      const timer = setInterval(() => {
        renewal = renewal.then(async () => {
          let leaseHandle
          try {
            leaseHandle = await open(path, 'r+')
            const current = JSON.parse(await leaseHandle.readFile('utf8')) as Partial<LeasePayload>
            if (current.owner !== owner) return
            const encoded = Buffer.from(JSON.stringify(payload()))
            await leaseHandle.truncate(0)
            await leaseHandle.write(encoded, 0, encoded.length, 0)
            await leaseHandle.sync()
          } catch { /* a replacement owner or storage failure invalidates this renewal */ }
          finally { await leaseHandle?.close().catch(() => undefined) }
        })
      }, Math.max(100, Math.floor(ttlSeconds * 1000 / 3)))
      timer.unref()
      return async () => {
        clearInterval(timer)
        await renewal
        try {
          const current = JSON.parse(await readFile(path, 'utf8')) as Partial<LeasePayload>
          if (current.owner === owner) await unlink(path)
        } catch { /* the lease expired or was already released */ }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      try {
        const current = JSON.parse(await readFile(path, 'utf8')) as Partial<LeasePayload>
        if (typeof current.expiresAt !== 'string' || Date.parse(current.expiresAt) > Date.now()) return null
        await unlink(path)
      } catch (readError) {
        if ((readError as NodeJS.ErrnoException).code !== 'ENOENT') return null
      }
    }
  }
  return null
}

export async function acquireArchiveLease(name: string, ttlSeconds = 300) {
  if (archiveStoreBackend() === 'filesystem') return acquireFilesystemLease(name, Math.min(600, Math.max(1, ttlSeconds)))
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
