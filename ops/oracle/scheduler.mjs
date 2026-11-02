import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { dueStages, nextRetryAt, parseJobResponse, publicationReady, retryDelay } from '../scheduler-core.mjs'

const base = process.env.DEUCE_INTERNAL_URL || 'http://web:3000'
const secret = process.env.CRON_SECRET
if (!secret) throw new Error('CRON_SECRET is required')

const refreshJobs = [
  { name: 'ATP refresh', path: '/api/cron/refresh' },
  { name: 'WTA refresh', path: '/api/cron/wta' },
]
const publicationJob = { name: 'validated publication', path: '/api/cron/publish' }
const jobs = [...refreshJobs, publicationJob]
const pipelineHour = Number(process.env.DEUCE_PIPELINE_HOUR_UTC || 22)
const pipelineMinute = Number(process.env.DEUCE_PIPELINE_MINUTE_UTC || 5)
const catchUpWindow = 12 * 60 * 60 * 1000
const maximumAttempts = Math.max(1, Number(process.env.DEUCE_SCHEDULER_MAX_ATTEMPTS || 5))
const heartbeatEvery = Math.max(30_000, Number(process.env.DEUCE_SCHEDULER_HEARTBEAT_MS || 60_000))
const statePath = process.env.DEUCE_SCHEDULER_STATE || (process.env.DEUCE_ARCHIVE_DIR
  ? join(process.env.DEUCE_ARCHIVE_DIR, '.scheduler', 'state.json')
  : join(process.cwd(), '.deuce-scheduler', 'state.json'))
const jobPaths = new Set(jobs.map(job => job.path))

function cleanStages(value) {
  const source = value && typeof value === 'object' ? value : {}
  return Object.fromEntries(Object.entries(source).filter(([path]) => jobPaths.has(path)).map(([path, stage]) => {
    const row = stage && typeof stage === 'object' ? stage : {}
    return [path, {
      status: ['pending', 'running', 'retrying', 'blocked', 'success'].includes(row.status) ? row.status : 'pending',
      attempts: Number.isSafeInteger(row.attempts) ? row.attempts : 0,
      lastAttemptAt: typeof row.lastAttemptAt === 'string' ? row.lastAttemptAt : undefined,
      nextAttemptAt: typeof row.nextAttemptAt === 'string' ? row.nextAttemptAt : undefined,
      operationStatus: typeof row.operationStatus === 'string' ? row.operationStatus : undefined,
      error: typeof row.error === 'string' ? row.error.slice(0, 160) : undefined,
    }]
  }))
}

let state = await readFile(statePath, 'utf8').then(value => {
  const parsed = JSON.parse(value)
  return {
    schema: 2,
    day: typeof parsed?.day === 'string' ? parsed.day : '',
    scheduledAt: typeof parsed?.scheduledAt === 'string' ? parsed.scheduledAt : undefined,
    nextRunAt: typeof parsed?.nextRunAt === 'string' ? parsed.nextRunAt : undefined,
    heartbeatAt: typeof parsed?.heartbeatAt === 'string' ? parsed.heartbeatAt : undefined,
    stages: cleanStages(parsed?.stages),
  }
}).catch(() => ({ schema: 2, day: '', stages: {} }))

let persistQueue = Promise.resolve()
function persist(next = state) {
  state = { ...next, schema: 2, heartbeatAt: new Date().toISOString() }
  persistQueue = persistQueue.then(async () => {
    const temporary = `${statePath}.${process.pid}.tmp`
    await mkdir(dirname(statePath), { recursive: true })
    await writeFile(temporary, JSON.stringify(state) + '\n', { mode: 0o600 })
    await rename(temporary, statePath)
  }).catch(error => console.error(JSON.stringify({ event: 'deuce.scheduler.state.failed', error: error instanceof Error ? error.message : 'unknown' })))
  return persistQueue
}

function targetFor(date) {
  const target = new Date(date)
  target.setUTCHours(pipelineHour, pipelineMinute, 0, 0)
  return target
}
const dayKey = date => date.toISOString().slice(0, 10)
const pipelineComplete = value => jobs.every(job => value.stages?.[job.path]?.status === 'success')

function freshState(day, scheduledAt) {
  return {
    schema: 2, day, scheduledAt: new Date(scheduledAt).toISOString(),
    stages: Object.fromEntries(jobs.map(job => [job.path, { status: 'pending', attempts: 0 }])),
  }
}

function pipelinePlan(allowCatchUp) {
  const now = new Date(), today = targetFor(now)
  const previous = today <= now ? today : new Date(today.getTime() - 86_400_000)
  const previousDay = dayKey(previous), age = now.getTime() - previous.getTime()
  if (allowCatchUp && age >= 0 && age <= catchUpWindow && state.day === previousDay && !pipelineComplete(state)) {
    const retryAt = nextRetryAt(state)
    if (retryAt) return { wait: Math.max(1_000, retryAt - Date.now()), day: previousDay, scheduledAt: previous.getTime() }
    const blocked = Object.values(state.stages).some(stage => stage.status === 'blocked')
    if (!blocked) return { wait: 1_000, day: previousDay, scheduledAt: previous.getTime() }
  }
  if (allowCatchUp && age >= 0 && age <= catchUpWindow && state.day !== previousDay) {
    return { wait: 1_000, day: previousDay, scheduledAt: previous.getTime() }
  }
  const next = new Date(today)
  if (next <= now || (state.day === dayKey(next) && pipelineComplete(state))) next.setUTCDate(next.getUTCDate() + 1)
  return { wait: Math.max(1_000, next.getTime() - now.getTime()), day: dayKey(next), scheduledAt: next.getTime() }
}

async function runJob(job) {
  const previous = state.stages[job.path] || { status: 'pending', attempts: 0 }
  const attempt = previous.attempts + 1
  const startedAt = new Date().toISOString()
  state.stages[job.path] = { ...previous, status: 'running', attempts: attempt, lastAttemptAt: startedAt, nextAttemptAt: undefined, error: undefined }
  await persist()
  try {
    const response = await fetch(`${base}${job.path}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(290_000),
    })
    const body = await response.text()
    const result = parseJobResponse(response.status, body)
    const canRetry = !result.ok && result.retryable && attempt < maximumAttempts
    state.stages[job.path] = {
      status: result.ok ? 'success' : canRetry ? 'retrying' : 'blocked',
      attempts: attempt, lastAttemptAt: startedAt, operationStatus: result.operationStatus,
      nextAttemptAt: canRetry ? new Date(Date.now() + retryDelay(attempt)).toISOString() : undefined,
      error: result.ok ? undefined : `HTTP ${response.status}`,
    }
    console.log(JSON.stringify({ event: 'deuce.scheduler', job: job.name, startedAt, finishedAt: new Date().toISOString(), status: response.status, outcome: state.stages[job.path].status, body: body.slice(0, 500) }))
    await persist()
    return result.ok
  } catch (error) {
    const canRetry = attempt < maximumAttempts
    state.stages[job.path] = {
      status: canRetry ? 'retrying' : 'blocked', attempts: attempt, lastAttemptAt: startedAt,
      nextAttemptAt: canRetry ? new Date(Date.now() + retryDelay(attempt)).toISOString() : undefined,
      error: error instanceof Error ? error.message.slice(0, 160) : 'unknown',
    }
    console.error(JSON.stringify({ event: 'deuce.scheduler.failed', job: job.name, startedAt, finishedAt: new Date().toISOString(), outcome: state.stages[job.path].status, error: state.stages[job.path].error }))
    await persist()
    return false
  }
}

async function runPipeline(day, scheduledAt) {
  if (state.day !== day) {
    state = freshState(day, scheduledAt)
    await persist()
  }
  console.log(JSON.stringify({ event: 'deuce.scheduler.pipeline.started', day, stages: state.stages, at: new Date().toISOString() }))
  for (const job of dueStages(refreshJobs, state)) await runJob(job)
  if (publicationReady(state, refreshJobs.map(job => job.path))) {
    for (const job of dueStages([publicationJob], state)) await runJob(job)
  }
  console.log(JSON.stringify({ event: 'deuce.scheduler.pipeline.finished', day, complete: pipelineComplete(state), stages: state.stages, at: new Date().toISOString() }))
  void schedulePipeline(true)
}

let timer
async function schedulePipeline(allowCatchUp) {
  const plan = pipelinePlan(allowCatchUp)
  state.nextRunAt = new Date(Date.now() + plan.wait).toISOString()
  await persist()
  console.log(JSON.stringify({ event: 'deuce.scheduler.next', job: 'ATP + WTA → publication', day: plan.day, at: state.nextRunAt }))
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (Date.now() - plan.scheduledAt > catchUpWindow) void schedulePipeline(true)
    else void runPipeline(plan.day, plan.scheduledAt)
  }, plan.wait)
}

setInterval(() => { void persist() }, heartbeatEvery).unref()
await schedulePipeline(true)
