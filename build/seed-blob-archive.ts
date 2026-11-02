import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { archiveStoreBackend } from '../lib/archive-store'
import { publishRecordSnapshot } from '../lib/revista/publish-snapshot'
import type { Snapshot } from '../lib/revista/snapshot'
import { readingSource } from './reading-source'

const root = readingSource()

async function read<T>(id: string): Promise<T> {
  return JSON.parse(gunzipSync(await readFile(join(root, `${id}.json.gz`))).toString()) as T
}

async function main() {
  const backend = archiveStoreBackend()
  if (backend !== 'vercel-blob' && backend !== 'filesystem') throw new Error('Configure Vercel Blob or the self-hosted filesystem archive before seeding')

  const manifest = await read<Snapshot['manifest']>('manifest')
  const pieceEntries = await Promise.all(manifest.pieces.map(async piece => [piece.id, await read<Snapshot['pieces'][string]>(`piece-${piece.id}`)] as const))
  const snapshot: Snapshot = {
    manifest,
    pieces: Object.fromEntries(pieceEntries),
    eras: await read('eras'),
    matches: await read('matches'),
    players: await read('players'),
    competition: await read('competition'),
    audit: await read('audit'),
  }

  if (snapshot.matches.length !== manifest.matchCount || Object.keys(snapshot.pieces).length !== manifest.pieces.length) {
    throw new Error('Bundled snapshot is incomplete; run npm run data:verify before seeding')
  }

  await publishRecordSnapshot(snapshot)
  console.log(JSON.stringify({ status: 'seeded', backend, version: manifest.version, matches: manifest.matchCount, pieces: manifest.pieces.length }))
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Archive seed failed')
  process.exitCode = 1
})
