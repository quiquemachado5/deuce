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
  const waiting=schedulerStateHealth({
    heartbeatAt:'2026-11-02T12:04:00.000Z',
    stages:{'/api/cron/wta':{status:'deferred',attempts:1,nextAttemptAt:'2026-11-03T00:05:00.000Z',operationStatus:'quota-reserve'}},
  },now)
  assert.equal(waiting.status,'healthy')
  assert.equal(waiting.stages['/api/cron/wta'].operationStatus,'quota-reserve')
  assert.equal(schedulerStateHealth({
    heartbeatAt:'2026-11-02T12:04:00.000Z',
    stages:{'/api/cron/wta-backfill':{status:'deferred-cycle',attempts:1,operationStatus:'quota-reserve'}},
  },now).status,'healthy')
  const optionalBlocked=schedulerStateHealth({
    heartbeatAt:'2026-11-02T12:04:00.000Z',
    stages:{
      '/api/cron/publish':{status:'success',attempts:1},
      '/api/cron/wta-backfill':{status:'blocked',attempts:1,error:'HTTP 503'},
    },
  },now)
  assert.equal(optionalBlocked.status,'healthy')
  assert.equal(optionalBlocked.stages['/api/cron/wta-backfill'].status,'blocked')
  assert.equal(optionalBlocked.stages['/api/cron/wta-backfill'].optional,true)
  assert.equal(optionalBlocked.stages['/api/cron/wta-backfill'].error,'HTTP 503')
  const optionalEnrichment=schedulerStateHealth({
    heartbeatAt:'2026-11-02T12:04:00.000Z',
    stages:{'/api/cron/enrich':{status:'blocked',attempts:1,error:'HTTP 503'}},
  },now)
  assert.equal(optionalEnrichment.status,'healthy')
  assert.equal(optionalEnrichment.stages['/api/cron/enrich'].optional,true)
})
