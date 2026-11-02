import { spawn } from 'node:child_process'
import { cachedReading, preserveWorkingReading, replaceCachedReading } from './local-reading-cache.mjs'
import { readingManifest, satisfiesReleaseSnapshot } from './snapshot-policy.mjs'

const cached = await readingManifest(cachedReading)
if (satisfiesReleaseSnapshot(cached)) {
  console.log(`Local reading snapshot reused: ${cached.matchCount} matches, version ${cached.version}`)
  process.exit(0)
}

const run = args => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env })
  child.on('error', reject)
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Local snapshot preparation exited ${code}`)))
})
const restore = await preserveWorkingReading()
try {
  await run(['build/ensure-snapshot.mjs'])
  await replaceCachedReading()
  const prepared = await readingManifest(cachedReading)
  if (!satisfiesReleaseSnapshot(prepared)) throw new Error('Local reading cache does not meet the release policy')
  console.log(`Local reading snapshot prepared: ${prepared.matchCount} matches, version ${prepared.version}`)
} finally {
  await restore()
}
