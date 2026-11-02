import { spawn } from 'node:child_process'
import { preserveWorkingReading, replaceCachedReading } from './local-reading-cache.mjs'

const buildEnvironment = { ...process.env, DEUCE_READING_DIR: 'data/reading' }
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: 'inherit', env: buildEnvironment })
  child.on('error', reject)
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)))
})
const node = (...args) => run(process.execPath, args)
const preserveWorkingSnapshot = process.env.CI !== '1' && process.env.CI !== 'true'
let backup
if (preserveWorkingSnapshot) {
  backup = await preserveWorkingReading()
}
try {
  await node('--import', './build/register.mjs', '--import', 'tsx', 'build/audit-tournament-media.ts')
  await node('build/ensure-snapshot.mjs')
  await node('--import', './build/register.mjs', '--import', 'tsx', 'build/prepare-player-bio.ts')
  await node('node_modules/next/dist/bin/next', 'build', '--webpack')
  if (backup) await replaceCachedReading()
} finally {
  if (backup) await backup()
}
