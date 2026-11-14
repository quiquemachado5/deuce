import { spawn } from 'node:child_process'
import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { preserveWorkingReading, replaceCachedReading } from './local-reading-cache.mjs'

const buildEnvironment = { ...process.env, DEUCE_READING_DIR: 'data/reading' }
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: 'inherit', env: buildEnvironment })
  child.on('error', reject)
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)))
})
const node = (...args) => run(process.execPath, args)
const pruneStandaloneTraceMetadata = async directory => {
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await pruneStandaloneTraceMetadata(path)
    else if (entry.name.endsWith('.nft.json')) await rm(path)
  }
}
const pruneStandaloneBuildDependencies = async directory => {
  // The application uses a custom static next/image loader. Sharp is needed
  // by the media audit above, but neither sharp nor its platform libvips
  // binaries are reachable from the production request graph.
  await Promise.all([
    rm(join(directory, 'node_modules', 'sharp'), { recursive: true, force: true }),
    rm(join(directory, 'node_modules', '@img'), { recursive: true, force: true }),
  ])
}
const preserveWorkingSnapshot = process.env.CI !== '1' && process.env.CI !== 'true'
let backup
if (preserveWorkingSnapshot) {
  backup = await preserveWorkingReading()
}
try {
  await node('--import', './build/register.mjs', '--import', 'tsx', 'build/audit-tournament-media.ts')
  await node('build/ensure-snapshot.mjs')
  await node('--import','./build/register.mjs','--import','tsx','build/prepare-navigation-products.ts')
  await node('--import','./build/register.mjs','--import','tsx','build/prepare-public-archive.ts')
  await node('--import', './build/register.mjs', '--import', 'tsx', 'build/prepare-player-bio.ts')
  await node('node_modules/next/dist/bin/next', 'build', '--webpack')
  // Next has already consumed these manifests to materialize the standalone
  // tree. Keeping 50+ route copies adds several megabytes to every image and
  // they are not read by the standalone server at runtime.
  const standalone = join(process.cwd(), '.next', 'standalone')
  await pruneStandaloneTraceMetadata(standalone)
  await pruneStandaloneBuildDependencies(standalone)
  if (backup) await replaceCachedReading()
} finally {
  if (backup) await backup()
}
