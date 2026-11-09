import { authorizedCronRequest } from '@/lib/cron-auth'
import { unauthorizedResponse } from '@/lib/security-events'
import { acquireArchiveLease, archiveStoreBackend } from '@/lib/archive-store'
import { cloudProbeRead, cloudRead, cloudWrite } from '@/lib/cloud-archive'
import { publishRecordSnapshot } from '@/lib/revista/publish-snapshot'
import type { Snapshot } from '@/lib/revista/snapshot'
import { withOperationHistory } from '@/lib/archive-operations'
import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { readingDirectory } from '@/lib/reading-directory'
import { bundledSeedAction, expectedBundledPieceCount, loadBundledSnapshotPieces } from '@/lib/revista/seed-snapshot'
import { invalidatePreparedGeneration } from '@/lib/revista/read-records'
import { materializeBundledWtaArchive } from '@/lib/wta-archive-bootstrap'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

const root = readingDirectory()

async function readBundled<T>(id: string): Promise<T> {
  return JSON.parse(gunzipSync(await readFile(join(root, `${id}.json.gz`))).toString()) as T
}

const deploymentBackupFiles = ['reading-v2-manifest.json', 'publish-status.json', 'seed-status.json'] as const

async function prepareDeploymentBackup(id: string) {
  if (!/^[a-f0-9]{40}$/.test(id)) throw new Error('Invalid deployment backup identifier')
  const archive = process.env.DEUCE_ARCHIVE_DIR
  if (!archive) throw new Error('Filesystem archive is not configured')
  const backup = join(archive, `.deploy-backup-${id}`)
  if (await stat(join(backup, 'meta.json')).then(() => true).catch(() => false)) {
    let matchesCurrent = true
    try {
      const meta = JSON.parse(await readFile(join(backup, 'meta.json'), 'utf8')) as { names?: unknown; existing?: unknown }
      const names = Array.isArray(meta.names) ? meta.names : undefined
      const existingNames = Array.isArray(meta.existing) ? meta.existing : undefined
      if (!names || !existingNames
        || names.length !== deploymentBackupFiles.length
        || deploymentBackupFiles.some((name, index) => names[index] !== name)
        || existingNames.some(name => typeof name !== 'string' || !deploymentBackupFiles.includes(name as typeof deploymentBackupFiles[number]))) {
        matchesCurrent = false
      } else {
        const existing = new Set(existingNames as string[])
        for (const name of deploymentBackupFiles) {
          const current = await readFile(join(archive, name)).catch(error => {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
            throw error
          })
          const saved = await readFile(join(backup, name)).catch(error => {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
            throw error
          })
          if (existing.has(name) !== Boolean(saved) || Boolean(current) !== Boolean(saved) || (current && saved && !current.equals(saved))) {
            matchesCurrent = false
            break
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code && (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      matchesCurrent = false
    }
    if (matchesCurrent) return backup
    // An interrupted attempt may leave this directory behind while the active
    // release publishes a newer pointer. Preserve the old snapshot for manual
    // forensics, but never use it for rollback; atomically replace it below
    // with a snapshot of the archive protected by the current lease.
    await rename(backup, `${backup}.stale-${Date.now()}-${process.pid}`)
  }
  const temporary = `${backup}.${process.pid}.tmp`
  await mkdir(temporary, { recursive: true })
  const existing: string[] = []
  for (const name of deploymentBackupFiles) {
    try {
      await copyFile(join(archive, name), join(temporary, name))
      existing.push(name)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  await writeFile(join(temporary, 'meta.json'), JSON.stringify({ names: deploymentBackupFiles, existing }))
  await rename(temporary, backup)
  return backup
}

export async function GET(request: Request) {
  if (!authorizedCronRequest(request)) return unauthorizedResponse(request, 'cron.seed')
  if (archiveStoreBackend() !== 'filesystem') {
    return Response.json({ error: 'The initial seed is only available for the self-hosted filesystem archive' }, { status: 409 })
  }

  const release = await acquireArchiveLease('tennis-provider', 600)
  if (!release) {
    return Response.json({ status: 'busy', error: 'Archive mutation is already in progress' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
  const attemptAt = new Date().toISOString()
  try {
    const previousPublication = await cloudProbeRead('publish-status').catch(() => undefined)
    const publicationStartedAt = Date.parse(String(previousPublication?.attemptAt || previousPublication?.at || ''))
    if (previousPublication?.status === 'running' && (!Number.isFinite(publicationStartedAt) || Date.now() - publicationStartedAt < 900_000)) {
      return Response.json({ status: 'busy', error: 'Publication is still running' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    }
    const deploymentBackup = request.headers.get('X-DEUCE-Deploy-Backup')
    if (deploymentBackup) await prepareDeploymentBackup(deploymentBackup)
    const manifest = await readBundled<Snapshot['manifest']>('manifest')
    const existing = await cloudRead('reading-v2-manifest')
    const action = bundledSeedAction(existing)
    const bundledArchive = await materializeBundledWtaArchive(cloudRead, cloudWrite)
    // A valid generation using the current derivation rules always wins over
    // the bundled seed: it may contain a newer provider refresh. An older or
    // incompatible rules generation is migrated from the validated bundle;
    // publishRecordSnapshot writes its immutable artifacts before the pointer.
    if (action === 'keep') {
      return Response.json({ status: 'already-seeded', manifest: existing, bundledArchive }, { headers: { 'Cache-Control': 'no-store' } })
    }

    await cloudWrite('seed-status', { status: 'running', attemptAt, at: attemptAt })
    const pieces = await loadBundledSnapshotPieces(manifest, readBundled)
    const snapshot: Snapshot = {
      manifest,
      pieces,
      eras: await readBundled('eras'),
      matches: await readBundled('matches'),
      players: await readBundled('players'),
      competition: await readBundled('competition'),
      audit: await readBundled('audit'),
      products: {
        editions: await readBundled('edition-products'),
        players: await readBundled('player-directory'),
        search: await readBundled('search-products'),
        elo: await readBundled('elo-products'),
        timeMachine: await readBundled('time-machine'),
      },
    }

    if (snapshot.matches.length !== manifest.matchCount || Object.keys(snapshot.pieces).length !== expectedBundledPieceCount(manifest)) {
      throw new Error('Bundled snapshot is incomplete')
    }

    const published = await publishRecordSnapshot(snapshot)
    invalidatePreparedGeneration()
    const completedAt = new Date().toISOString()
    const migrated = action === 'migrate'
    const previousVersion = existing && typeof existing === 'object' && typeof (existing as { version?: unknown }).version === 'string'
      ? (existing as { version: string }).version : undefined
    await cloudWrite('publish-status', withOperationHistory(previousPublication, {
      status: 'success',
      attemptAt,
      lastSuccessAt: completedAt,
      publicationAt: published.generatedAt,
      at: completedAt,
      version: published.version,
      matches: published.matchCount,
      tours: published.summary.tours,
      lists: published.pieces.length + (published.circuitPieces?.wta.length || 0),
      incompleteEditions: snapshot.audit.filter(edition => edition.completeDraw === false).length,
      initialSeed: !migrated,
      ...(migrated ? { migratedFromVersion: previousVersion || 'incompatible' } : {}),
    }))
    await cloudWrite('seed-status', {
      status: 'success',
      action: migrated ? 'migrated' : 'seeded',
      attemptAt,
      at: completedAt,
      version: published.version,
      matches: published.matchCount,
      pieces: Object.keys(snapshot.pieces).length,
      atpPieces: manifest.pieces.length,
      wtaPieces: manifest.circuitPieces?.wta.length || 0,
      bundledArchive,
    })
    return Response.json({
      status: migrated ? 'migrated' : 'seeded',
      version: published.version,
      ...(migrated ? { migratedFromVersion: previousVersion || 'incompatible' } : {}),
      matches: published.matchCount,
      pieces: Object.keys(snapshot.pieces).length,
      atpPieces: manifest.pieces.length,
      wtaPieces: manifest.circuitPieces?.wta.length || 0,
      bundledArchive,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown seed error'
    await cloudWrite('seed-status', { status: 'error', attemptAt, at: new Date().toISOString(), message }).catch(() => undefined)
    return Response.json({ error: message }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  } finally {
    await release()
  }
}
