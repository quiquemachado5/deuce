import test from 'node:test'
import assert from 'node:assert/strict'
import { schedulerStateHealth } from '@/lib/scheduler-health'

test('scheduler health detects a stale heartbeat and blocked stages', () => {
  const now = Date.parse('2026-11-02T12:05:00.000Z')
  assert.equal(schedulerStateHealth({ heartbeatAt: '2026-11-02T12:00:00.000Z' }, now).status, 'stale')
  const degraded = schedulerStateHealth({
    heartbeatAt: '2026-11-02T12:04:00.000Z',
    stages: { '/api/cron/wta': { status: 'blocked', attempts: 4, error: 'HTTP 503' } },
  }, now)
  assert.equal(degraded.status, 'degraded')
  assert.equal(degraded.stages['/api/cron/wta'].attempts, 4)
})
