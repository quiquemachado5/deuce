import { authorizedCronRequest } from '@/lib/cron-auth'
import { archiveStoreBackend } from '@/lib/archive-store'
import { cloudRead, cloudWrite } from '@/lib/cloud-archive'
import { publishRecordSnapshot } from '@/lib/revista/publish-snapshot'
import type { Snapshot } from '@/lib/revista/snapshot'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

const root = join(process.cwd(), 'data', 'reading')

async function readBundled<T>(id: string): Promise<T> {
  return JSON.parse(gunzipSync(await readFile(join(root, `${id}.json.gz`))).toString()) as T
}

export async function GET(request: Request) {
  if (!authorizedCronRequest(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (archiveStoreBackend() !== 'filesystem') {
    return Response.json({ error: 'The initial seed is only available for the self-hosted filesystem archive' }, { status: 409 })
  }

  const attemptAt = new Date().toISOString()
  try {
    const existing = await cloudRead('reading-v2-manifest')
    if (existing && typeof existing === 'object' && typeof (existing as { version?: unknown }).version === 'string') {
      return Response.json({ status: 'already-seeded', manifest: existing }, { headers: { 'Cache-Control': 'no-store' } })
    }

    await cloudWrite('seed-status', { status: 'running', attemptAt, at: attemptAt })
    const manifest = await readBundled<Snapshot['manifest']>('manifest')
    const pieceEntries = await Promise.all(manifest.pieces.map(async piece => (
      [piece.id, await readBundled<Snapshot['pieces'][string]>(`piece-${piece.id}`)] as const
    )))
    const snapshot: Snapshot = {
      manifest,
      pieces: Object.fromEntries(pieceEntries),
      eras: await readBundled('eras'),
      matches: await readBundled('matches'),
      players: await readBundled('players'),
      competition: await readBundled('competition'),
      audit: await readBundled('audit'),
    }

    if (snapshot.matches.length !== manifest.matchCount || Object.keys(snapshot.pieces).length !== manifest.pieces.length) {
      throw new Error('Bundled snapshot is incomplete')
    }

    const published = await publishRecordSnapshot(snapshot)
    await cloudWrite('seed-status', {
      status: 'success',
      attemptAt,
      at: new Date().toISOString(),
      version: published.version,
      matches: published.matchCount,
      pieces: published.pieces.length,
    })
    return Response.json({
      status: 'seeded',
      version: published.version,
      matches: published.matchCount,
      pieces: published.pieces.length,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown seed error'
    await cloudWrite('seed-status', { status: 'error', attemptAt, at: new Date().toISOString(), message }).catch(() => undefined)
    return Response.json({ error: message }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
