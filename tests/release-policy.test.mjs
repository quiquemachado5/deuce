import test from 'node:test'
import assert from 'node:assert/strict'
import { releaseFailures } from '../ops/release-policy.mjs'

const baseline = {
  minimumMatches: 250, minimumTours: { atp: 150, wta: 100 }, minimumStatistics: 10,
  requiredRulesVersion: 'rules-v1', requireCommit: true, requireStorage: true,
  requireScheduler: true, maximumSchedulerHeartbeatSeconds: 180,
}
const healthy = {
  status: 'healthy', ageHours: 1, matches: 250, tours: { atp: 150, wta: 100 }, statistics: 10,
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
})
