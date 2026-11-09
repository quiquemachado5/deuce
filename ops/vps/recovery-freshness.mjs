import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function recoveryFreshness(row, maximumAgeHours, now = Date.now()) {
  const maximum = Number(maximumAgeHours)
  const verifiedAt = Date.parse(row?.verifiedAt || row?.at || '')
  const ageHours = (now - verifiedAt) / 3_600_000
  const fresh = Number.isFinite(maximum)
    && maximum > 0
    && Number.isFinite(verifiedAt)
    && ageHours >= 0
    && ageHours <= maximum
    && row?.restoreValidated === true
  return { fresh, ageHours: Number.isFinite(ageHours) ? ageHours : null }
}

async function main() {
  const file = process.argv.find(value => value.startsWith('--file='))?.slice(7)
  const maximum = process.argv.find(value => value.startsWith('--max-age-hours='))?.slice(16)
  if (!file || !maximum) throw new Error('Usage: recovery-freshness.mjs --file=PATH --max-age-hours=N')
  let row = null
  try { row = JSON.parse(await readFile(resolve(file), 'utf8')) } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  const result = recoveryFreshness(row, maximum)
  console.log(JSON.stringify(result))
  if (!result.fresh) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Recovery freshness check failed')
    process.exitCode = 1
  })
}
