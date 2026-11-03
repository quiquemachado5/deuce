import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { releaseFailures } from '../ops/release-policy.mjs'
import { hasRequiredSnapshotArtifacts, satisfiesReleaseSnapshot } from '../build/snapshot-policy.mjs'

const baseline = {
  minimumMatches: 250, minimumTours: { atp: 150, wta: 100 }, minimumStatistics: 10,
  minimumStatisticsByTour: { atp: 6, wta: 4 },
  requiredRulesVersion: 'rules-v1', requireCommit: true, requireStorage: true,
  requireScheduler: true, maximumSchedulerHeartbeatSeconds: 180,
}
const healthy = {
  status: 'healthy', ageHours: 1, matches: 250, tours: { atp: 150, wta: 100 }, statistics: 10,
  statisticsByTour: { atp: 6, wta: 4 },
  datasetVersion: 'a'.repeat(20), rulesVersion: 'rules-v1', storage: { available: true },
  deployment: { commit: 'b'.repeat(40) }, scheduler: { configured: true, status: 'healthy', heartbeatAgeSeconds: 30 },
}

test('release policy enforces every circuit, commit and scheduler heartbeat', () => {
  assert.deepEqual(releaseFailures(healthy, baseline), [])
  const failures = releaseFailures({ ...healthy, tours: { atp: 150, wta: 0 }, deployment: { commit: null }, scheduler: { configured: true, status: 'stale', heartbeatAgeSeconds: 500 } }, baseline)
  assert.ok(failures.includes('Pérdida de cobertura WTA'))
  assert.ok(failures.includes('Commit del despliegue ausente'))
  assert.ok(failures.some(value => value.startsWith('Scheduler ')))
  assert.ok(failures.includes('Totales por circuito incoherentes con el archivo'))
  assert.ok(releaseFailures({ ...healthy, statisticsByTour: { atp: 10, wta: 0 } }, baseline).includes('Pérdida de catálogo WTA'))
})

test('first release accepts only absent daily rows and keeps every other gate strict', () => {
  const unavailable = { status: 'unavailable', at: null, ageHours: null }
  const first = { ...healthy, status: 'degraded', dailyUpdate: { atp: unavailable, wta: unavailable, publication: unavailable, staleAfterHours: 36 } }
  assert.deepEqual(releaseFailures(first, baseline, { allowInitialDailyUnavailable: true }), [])
  assert.ok(releaseFailures(first, baseline).some(value => value === 'Estado degraded'))
  const seeded = { ...first, initialSeed: true, dailyUpdate: { ...first.dailyUpdate,
    publication: { status: 'success', initialSeed: true, at: '2026-11-02T12:00:00Z', ageHours: 1 } } }
  assert.deepEqual(releaseFailures(seeded, baseline, { allowInitialDailyUnavailable: true }), [])
  const unmarkedSeed = { ...seeded, dailyUpdate: { ...seeded.dailyUpdate, publication: { ...seeded.dailyUpdate.publication, initialSeed: false } } }
  assert.ok(releaseFailures(unmarkedSeed, baseline, { allowInitialDailyUnavailable: true }).includes('Estado degraded'))
  const staleSeed = { ...seeded, dailyUpdate: { ...seeded.dailyUpdate, publication: { ...seeded.dailyUpdate.publication, ageHours: 37 } } }
  assert.ok(releaseFailures(staleSeed, baseline, { allowInitialDailyUnavailable: true }).includes('Estado degraded'))
  const failedDaily = { ...first, dailyUpdate: { ...first.dailyUpdate, wta: { status: 'error', at: null, ageHours: null } } }
  assert.ok(releaseFailures(failedDaily, baseline, { allowInitialDailyUnavailable: true }).includes('Estado degraded'))
  const noStorage = { ...first, storage: { available: false } }
  assert.ok(releaseFailures(noStorage, baseline, { allowInitialDailyUnavailable: true }).includes('Capacidad del archivo no verificada'))
})

test('bundled snapshot policy requires the record catalogue of both circuits', () => {
  const snapshotBaseline = { minimumMatches: 250, minimumTours: { atp: 150, wta: 100 }, minimumStatistics: 10,
    minimumStatisticsByTour: { atp: 6, wta: 4 }, requiredRulesVersion: 'rules-v1' }
  const manifest = { version: 'a'.repeat(20), rulesVersion: 'rules-v1', matchCount: 250,
    pieces: Array.from({ length: 6 }, (_, index) => ({ id: `atp-${index}` })),
    circuitPieces: { wta: Array.from({ length: 4 }, (_, index) => ({ id: `wta-${index}` })) },
    summary: { tours: { atp: 150, wta: 100 } } }
  assert.equal(satisfiesReleaseSnapshot(manifest, snapshotBaseline), true)
  assert.equal(satisfiesReleaseSnapshot({ ...manifest, circuitPieces: { wta: [] } }, snapshotBaseline), false)
})

test('bundled snapshot policy requires every declared immutable detail partition', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'deuce-snapshot-policy-'))
  const manifest = { matchCount: 2, matchPartitions: [{ id: 'matches-atp-2020s' }, { id: 'matches-wta-2020s' }] }
  const browser = { count: 2, partitions: [{ id: 'matches-atp-2020s', count: 1 }, { id: 'matches-wta-2020s', count: 1 }] }
  try {
    await mkdir(directory, { recursive: true })
    for (const id of ['manifest', 'competition', 'reconciliation', 'matches-atp-2020s']) {
      await writeFile(join(directory, `${id}.json.gz`), 'artifact')
    }
    await writeFile(join(directory, 'browser-index.json.gz'), gzipSync(JSON.stringify(browser)))
    assert.equal(await hasRequiredSnapshotArtifacts(directory, manifest), false)
    await writeFile(join(directory, 'matches-wta-2020s.json.gz'), 'artifact')
    assert.equal(await hasRequiredSnapshotArtifacts(directory, manifest), false)
    await writeFile(join(directory, 'browser-matches-atp-2020s.json.gz'), 'artifact')
    assert.equal(await hasRequiredSnapshotArtifacts(directory, manifest), false)
    await writeFile(join(directory, 'browser-matches-wta-2020s.json.gz'), 'artifact')
    assert.equal(await hasRequiredSnapshotArtifacts(directory, manifest), true)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
