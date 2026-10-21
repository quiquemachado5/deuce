import test from 'node:test'
import assert from 'node:assert/strict'
import { archiveGet, archiveReadFailure } from '../lib/archive-get'

test('archive GET retries a transient rejection with fresh timeout signals', async () => {
  const signals: AbortSignal[] = []
  const delays: number[] = []
  const data = await archiveGet(signal => {
    signals.push(signal)
    return Promise.resolve(signals.length < 3
      ? { data: null, error: { code: 'PGRST303' }, status: 401 }
      : { data: { preserved: true }, error: null, status: 200 })
  }, async ms => { delays.push(ms) })
  assert.deepEqual(data, { preserved: true })
  assert.deepEqual(delays, [300, 900])
  assert.equal(new Set(signals).size, 3)
  assert.ok(signals.every(signal => !signal.aborted))
})

test('archive GET recovers from network responses, timeouts, and server failures', async () => {
  for (const failure of [
    { data: null, error: { code: '' }, status: 0 },
    { data: null, error: { code: 'PGRST002' }, status: 503 },
    { data: null, error: { code: 'XX000' }, status: 500 },
    new DOMException('sensitive timeout details', 'TimeoutError'),
    new DOMException('sensitive abort details', 'AbortError'),
    new TypeError('sensitive fetch details'),
    Object.assign(new Error('sensitive socket details'), { code: 'ECONNRESET' }),
  ]) {
    let attempts = 0
    const result = await archiveGet(() => {
      attempts++
      if (attempts > 1) return Promise.resolve({ data: ['complete'], error: null, status: 200 })
      if (failure instanceof Error) throw failure
      return Promise.resolve(failure)
    }, async () => {})
    assert.deepEqual(result, ['complete'])
    assert.equal(attempts, 2)
  }
})

test('archive GET exhausts its budget without returning incomplete data or sensitive details', async () => {
  let attempts = 0
  const delays: number[] = []
  await assert.rejects(archiveGet(() => {
    attempts++
    return Promise.resolve({ data: ['partial'], error: { code: 'PGRST303', message: 'credential=do-not-log' }, status: 401 })
  }, async ms => { delays.push(ms) }), error => {
    assert.deepEqual(archiveReadFailure(error), { code: 'PGRST303', status: 401, name: 'Error' })
    assert.ok(error instanceof Error)
    assert.doesNotMatch(error.message, /credential|do-not-log/)
    return true
  })
  assert.equal(attempts, 3)
  assert.deepEqual(delays, [300, 900])
})

test('archive GET stops immediately on deterministic errors and preserves missing objects', async () => {
  for (const failure of [
    { code: 'PGRST301', status: 401 },
    { code: '42501', status: 403 },
    { code: 'PGRST100', status: 400 },
    { code: 'PGRST205', status: 404 },
  ]) {
    let attempts = 0
    await assert.rejects(archiveGet(() => {
      attempts++
      return Promise.resolve({ data: null, error: { code: failure.code }, status: failure.status })
    }, async () => assert.fail('deterministic failures must not wait')))
    assert.equal(attempts, 1)
  }
  let attempts = 0
  assert.equal(await archiveGet(() => {
    attempts++
    return Promise.resolve({ data: null, error: null, status: 200 })
  }), null)
  assert.equal(attempts, 1)
})

test('archive GET does not retry programming errors and sanitizes diagnostic labels', async () => {
  let attempts = 0
  await assert.rejects(archiveGet(() => {
    attempts++
    throw new Error('credential=do-not-log')
  }, async () => assert.fail('unexpected errors must not wait')), error => {
    assert.ok(error instanceof Error)
    assert.doesNotMatch(error.message, /credential|do-not-log/)
    return true
  })
  assert.equal(attempts, 1)
  assert.deepEqual(archiveReadFailure({ code: 'secret value!', name: 'secret value!' }, 401), { code: 'UNKNOWN', status: 401, name: 'Error' })
})
