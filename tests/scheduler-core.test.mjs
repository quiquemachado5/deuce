import test from 'node:test'
import assert from 'node:assert/strict'
import { dueStages, heartbeatBootstrapState, parseJobResponse, publicationReady, retryDelay } from '../ops/scheduler-core.mjs'

test('scheduler retries transient failures exponentially and defers quota exhaustion', () => {
  assert.equal(retryDelay(1), 60_000)
  assert.equal(retryDelay(2), 300_000)
  assert.equal(retryDelay(99), 3_600_000)
  assert.deepEqual(parseJobResponse(503, JSON.stringify({ status: 'error' })), {
    ok: false, retryable: true, operationStatus: 'error',
  })
  assert.deepEqual(parseJobResponse(503, JSON.stringify({ status: 'quota-reserve' })), {
    ok: false, retryable: false, deferred: true, operationStatus: 'quota-reserve', retryAt: undefined,
  })
  assert.deepEqual(parseJobResponse(429, JSON.stringify({ status: 'quota-reserve', retryAt:'2026-11-03T00:05:00.000Z' })), {
    ok: false, retryable: false, deferred: true, operationStatus: 'quota-reserve', retryAt:'2026-11-03T00:05:00.000Z',
  })
})

test('bootstrap heartbeat starts without runnable or blocked pipeline stages', () => {
  assert.deepEqual(heartbeatBootstrapState(), { schema: 2, day: 'bootstrap', stages: {} })
})

test('ATP and WTA remain independent while publication waits for both', () => {
  const jobs = [{ path: '/atp' }, { path: '/wta' }]
  const state = { stages: {
    '/atp': { status: 'retrying', nextAttemptAt: '2026-11-02T12:00:00.000Z' },
    '/wta': { status: 'pending' },
    '/publish': { status: 'pending' },
  } }
  assert.deepEqual(dueStages(jobs, state, Date.parse('2026-11-02T11:59:00.000Z')).map(job => job.path), ['/wta'])
  state.stages['/atp'].nextAttemptAt = 'invalid-date'
  assert.deepEqual(dueStages(jobs, state, Date.parse('2026-11-02T11:59:00.000Z')).map(job => job.path), ['/atp', '/wta'])
  state.stages['/atp']={status:'deferred',nextAttemptAt:'2026-11-03T00:05:00.000Z'}
  assert.deepEqual(dueStages(jobs,state,Date.parse('2026-11-02T23:59:00.000Z')).map(job=>job.path),['/wta'])
  state.stages['/history']={status:'deferred-cycle'}
  assert.deepEqual(dueStages([{path:'/history'}],state,Date.parse('2026-11-03T00:06:00.000Z')),[])
  assert.equal(publicationReady(state, ['/atp', '/wta']), false)
  state.stages['/atp'].status = 'success'
  state.stages['/wta'].status = 'success'
  assert.equal(publicationReady(state, ['/atp', '/wta']), true)
})
