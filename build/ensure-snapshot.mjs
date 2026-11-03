import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { hasRequiredSnapshotArtifacts, readingManifest, satisfiesReleaseSnapshot } from './snapshot-policy.mjs'

const reading = join(process.cwd(), 'data', 'reading')

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env })
    child.on('error', reject)
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Snapshot command exited ${code}`)))
  })
}

let current = await readingManifest(reading)
if (satisfiesReleaseSnapshot(current) && await hasRequiredSnapshotArtifacts(reading, current)) {
  console.log(`Reading snapshot reused: ${current.matchCount} matches, version ${current.version}`)
  process.exit(0)
}
if (process.env.DEUCE_SNAPSHOT_MANIFEST_URL) {
  try { await run(['build/snapshot-artifact.mjs', 'restore', '--target=data/reading']) }
  catch (error) { console.warn(`Snapshot restore unavailable; rebuilding from compact sources: ${error instanceof Error ? error.message : 'unknown error'}`) }
  current = await readingManifest(reading)
}
if (!satisfiesReleaseSnapshot(current) || !await hasRequiredSnapshotArtifacts(reading, current)) {
  await run(['--import', './build/register.mjs', '--import', 'tsx', 'build/prepare-records.ts'])
  current = await readingManifest(reading)
}
if (!satisfiesReleaseSnapshot(current) || !await hasRequiredSnapshotArtifacts(reading, current)) throw new Error('Prepared snapshot does not meet the release minimum for every circuit')
console.log(`Reading snapshot prepared: ${current.matchCount} matches, version ${current.version}`)
