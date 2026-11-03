import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'

export const releaseBaseline = JSON.parse(await readFile(new URL('../ops/release-baseline.json', import.meta.url), 'utf8'))

export async function readingManifest(directory) {
  try { return JSON.parse(gunzipSync(await readFile(join(directory, 'manifest.json.gz'))).toString()) }
  catch { return undefined }
}

export function satisfiesReleaseSnapshot(value, baseline = releaseBaseline) {
  if (!value || !/^[a-f0-9]{20}$/.test(value.version || '') || value.rulesVersion !== baseline.requiredRulesVersion) return false
  const statisticsByTour = { atp: value.pieces?.length || 0, wta: value.circuitPieces?.wta?.length || 0 }
  const statistics = statisticsByTour.atp + statisticsByTour.wta
  if (value.matchCount < baseline.minimumMatches || statistics < baseline.minimumStatistics) return false
  if (!Object.entries(baseline.minimumStatisticsByTour || {}).every(([tour, count]) => statisticsByTour[tour] >= count)) return false
  const tours = value.summary?.tours || {}
  if (!Object.entries(baseline.minimumTours || {}).every(([tour, count]) => (tours[tour] || 0) >= count)) return false
  return Object.keys(baseline.minimumTours || {}).reduce((sum, tour) => sum + (tours[tour] || 0), 0) === value.matchCount
}

/** Release images need every immutable detail shard declared by the manifest. */
export async function hasRequiredSnapshotArtifacts(directory, value) {
  const partitions = value?.matchPartitions
  if (!Array.isArray(partitions) || partitions.length === 0) return false
  let browser
  try { browser = JSON.parse(gunzipSync(await readFile(join(directory, 'browser-index.json.gz'))).toString()) }
  catch { return false }
  if (!browser || browser.count !== value.matchCount || !Array.isArray(browser.partitions) || browser.partitions.length === 0
    || browser.partitions.reduce((sum, partition) => sum + (Number.isSafeInteger(partition?.count) ? partition.count : 0), 0) !== value.matchCount) return false
  const files = ['manifest', 'browser-index', 'competition', 'reconciliation', ...partitions.map(partition => partition?.id),
    ...browser.partitions.map(partition => typeof partition?.id === 'string' ? `browser-${partition.id}` : undefined)]
  if (files.some(id => typeof id !== 'string' || !id)) return false
  const sizes = await Promise.all(files.map(async id => {
    try { return (await stat(join(directory, `${id}.json.gz`))).size }
    catch { return 0 }
  }))
  return sizes.every(size => size > 0)
}
