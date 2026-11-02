export const DEFAULT_RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]

export function heartbeatBootstrapState() {
  return { schema: 2, day: 'bootstrap', stages: {} }
}

export function retryDelay(attempt, delays = DEFAULT_RETRY_DELAYS_MS) {
  const index = Math.max(0, Math.min(delays.length - 1, Number(attempt) - 1))
  return delays[index]
}

export function parseJobResponse(status, body) {
  let payload
  try { payload = JSON.parse(body) } catch { payload = undefined }
  const operationStatus = typeof payload?.status === 'string' ? payload.status : undefined
  const deferred = new Set(['quota-reserve', 'free-history-limit'])
  const retryAt = typeof payload?.retryAt === 'string' && Number.isFinite(Date.parse(payload.retryAt)) ? payload.retryAt : undefined
  if (operationStatus && deferred.has(operationStatus)) return { ok: false, retryable: false, deferred: true, operationStatus, retryAt }
  if (status >= 200 && status < 300) return { ok: true, retryable: false, operationStatus: operationStatus || 'success' }
  return {
    ok: false,
    retryable: status === 408 || status === 425 || status === 429 || status >= 500,
    operationStatus: operationStatus || `http-${status}`,
  }
}

export function dueStages(jobs, state, now = Date.now()) {
  return jobs.filter(job => {
    const stage = state.stages?.[job.path]
    if (stage?.status === 'success' || stage?.status === 'blocked' || stage?.status === 'deferred-cycle') return false
    const next = typeof stage?.nextAttemptAt === 'string' ? Date.parse(stage.nextAttemptAt) : Number.NaN
    return !Number.isFinite(next) || next <= now
  })
}

export function publicationReady(state, refreshPaths) {
  return refreshPaths.every(path => state.stages?.[path]?.status === 'success')
}

export function nextRetryAt(state) {
  const times = Object.values(state.stages || {}).flatMap(stage =>
    ['retrying','deferred'].includes(stage?.status) && typeof stage.nextAttemptAt === 'string' ? [Date.parse(stage.nextAttemptAt)] : [])
    .filter(Number.isFinite)
  return times.length ? Math.min(...times) : undefined
}
