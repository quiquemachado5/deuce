import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'

export const releaseBaseline = JSON.parse(await readFile(new URL('../ops/release-baseline.json', import.meta.url), 'utf8'))

export async function readingManifest(directory) {
  try { return JSON.parse(gunzipSync(await readFile(join(directory, 'manifest.json.gz'))).toString()) }
  catch { return undefined }
}

export function satisfiesReleaseSnapshot(value, baseline = releaseBaseline) {
  if (!value || !/^[a-f0-9]{20}$/.test(value.version || '') || value.rulesVersion !== baseline.requiredRulesVersion) return false
  if (value.matchCount < baseline.minimumMatches || value.pieces?.length < baseline.minimumStatistics) return false
  const tours = value.summary?.tours || {}
  if (!Object.entries(baseline.minimumTours || {}).every(([tour, count]) => (tours[tour] || 0) >= count)) return false
  return Object.keys(baseline.minimumTours || {}).reduce((sum, tour) => sum + (tours[tour] || 0), 0) === value.matchCount
}
