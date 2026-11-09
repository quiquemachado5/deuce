import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { archiveStoreBackend } from '../lib/archive-store'
import { publishRecordSnapshot } from '../lib/revista/publish-snapshot'
import type { Snapshot } from '../lib/revista/snapshot'
import { readingSource } from './reading-source'
import { expectedBundledPieceCount, loadBundledSnapshotPieces } from '../lib/revista/seed-snapshot'
import { cloudRead, cloudWrite } from '../lib/cloud-archive'
import { materializeBundledWtaArchive } from '../lib/wta-archive-bootstrap'

const root = readingSource()

async function read<T>(id: string): Promise<T> {
  return JSON.parse(gunzipSync(await readFile(join(root, `${id}.json.gz`))).toString()) as T
}

async function main() {
  const backend = archiveStoreBackend()
  if (backend !== 'filesystem') throw new Error('Configure the self-hosted filesystem archive before seeding')

  const manifest = await read<Snapshot['manifest']>('manifest')
  const pieces = await loadBundledSnapshotPieces(manifest, read)
  const snapshot: Snapshot = {
    manifest,
    pieces,
    eras: await read('eras'),
    matches: await read('matches'),
    players: await read('players'),
    competition: await read('competition'),
    audit: await read('audit'),
    products: {
      editions: await read('edition-products'),
      players: await read('player-directory'),
      search: await read('search-products'),
      elo: await read('elo-products'),
      timeMachine: await read('time-machine'),
    },
  }

  if (snapshot.matches.length !== manifest.matchCount || Object.keys(snapshot.pieces).length !== expectedBundledPieceCount(manifest)) {
    throw new Error('Bundled snapshot is incomplete; run npm run data:verify before seeding')
  }

  const bundledArchive = await materializeBundledWtaArchive(cloudRead, cloudWrite)
  await publishRecordSnapshot(snapshot)
  console.log(JSON.stringify({ status: 'seeded', backend, version: manifest.version, matches: manifest.matchCount,
    pieces: Object.keys(snapshot.pieces).length, atpPieces: manifest.pieces.length, wtaPieces: manifest.circuitPieces?.wta.length || 0, bundledArchive }))
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Archive seed failed')
  process.exitCode = 1
})
