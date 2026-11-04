import { readFile } from 'node:fs/promises'
import { releaseFailures } from './release-policy.mjs'

const baseline = JSON.parse(await readFile(new URL('./release-baseline.json', import.meta.url), 'utf8'))
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3)
const url = argument('url') || process.env.DEUCE_RELEASE_HEALTH_URL || `${baseline.productionUrl}/api/health/deep`
const response = await fetch(url, { signal: AbortSignal.timeout(30_000), cache: 'no-store' })
if (!response.ok) throw new Error(`Health endpoint: HTTP ${response.status}`)
const health = await response.json()
const failures = releaseFailures(health, baseline, {
  allowDegraded: process.argv.includes('--allow-degraded'),
  allowInitialDailyUnavailable: process.argv.includes('--allow-initial-daily-unavailable'),
  expectedCommit: argument('expected-commit') || process.env.DEUCE_EXPECTED_COMMIT,
  expectedDatasetVersion: argument('expected-dataset') || process.env.DEUCE_EXPECTED_DATASET_VERSION,
})
console.log(JSON.stringify({ verified: failures.length === 0, datasetVersion: health.datasetVersion, commit: health.deployment?.commit, tours: health.tours, scheduler: health.scheduler?.status, healthIssues: health.healthIssues, failures }, null, 2))
if (failures.length) process.exitCode = 1
