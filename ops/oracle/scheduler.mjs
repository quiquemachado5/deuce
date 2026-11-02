import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const base = process.env.DEUCE_INTERNAL_URL || 'http://web:3000'
const secret = process.env.CRON_SECRET
if (!secret) throw new Error('CRON_SECRET is required')

const jobs = [
  { name: 'ATP refresh', path: '/api/cron/refresh' },
  { name: 'WTA refresh', path: '/api/cron/wta' },
  { name: 'validated publication', path: '/api/cron/publish' },
]
const pipelineHour = 22
const pipelineMinute = 5
const catchUpWindow = 12 * 60 * 60 * 1000
const statePath = process.env.DEUCE_SCHEDULER_STATE || (process.env.DEUCE_ARCHIVE_DIR
  ? join(process.env.DEUCE_ARCHIVE_DIR, '.scheduler', 'state.json')
  : join(process.cwd(), '.deuce-scheduler', 'state.json'))
const jobPaths = new Set(jobs.map(job => job.path))
let state = await readFile(statePath, 'utf8').then(value => {
  const parsed = JSON.parse(value)
  return {
    day: typeof parsed?.day === 'string' ? parsed.day : '',
    completed: Array.isArray(parsed?.completed) ? parsed.completed.filter(path => jobPaths.has(path)) : [],
  }
}).catch(() => ({ day: '', completed: [] }))

function targetFor(date) {
  const target = new Date(date)
  target.setUTCHours(pipelineHour, pipelineMinute, 0, 0)
  return target
}

function dayKey(date) {
  return date.toISOString().slice(0, 10)
}

function completedFor(day) {
  return state.day === day ? new Set(state.completed) : new Set()
}

function pipelineComplete(day) {
  const completed = completedFor(day)
  return jobs.every(job => completed.has(job.path))
}

function pipelinePlan(allowCatchUp) {
  const now = new Date(), today = targetFor(now)
  const previous = today <= now ? today : new Date(today.getTime() - 86_400_000)
  const previousDay = dayKey(previous), age = now.getTime() - previous.getTime()
  if (allowCatchUp && age >= 0 && age <= catchUpWindow && !pipelineComplete(previousDay)) {
    return { wait: 1_000, day: previousDay, scheduledAt: previous.getTime() }
  }
  const next = new Date(today)
  if (next <= now || pipelineComplete(dayKey(next))) next.setUTCDate(next.getUTCDate() + 1)
  return { wait: Math.max(1_000, next.getTime() - now.getTime()), day: dayKey(next), scheduledAt: next.getTime() }
}

async function saveState(day, completed) {
  const next = { day, completed: [...completed] }
  const temporary = `${statePath}.${process.pid}.tmp`
  await mkdir(dirname(statePath), { recursive: true })
  await writeFile(temporary, JSON.stringify(next) + '\n', { mode: 0o600 })
  await rename(temporary, statePath)
  state = next
}

async function runJob(job) {
  const startedAt = new Date().toISOString()
  try {
    const response = await fetch(`${base}${job.path}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(290_000),
    })
    const body = await response.text()
    console.log(JSON.stringify({ event: 'deuce.scheduler', job: job.name, startedAt, finishedAt: new Date().toISOString(), status: response.status, body: body.slice(0, 500) }))
    return response.ok
  } catch (error) {
    console.error(JSON.stringify({ event: 'deuce.scheduler.failed', job: job.name, startedAt, finishedAt: new Date().toISOString(), error: error instanceof Error ? error.message : 'unknown' }))
    return false
  }
}

async function runPipeline(day) {
  const completed = completedFor(day)
  console.log(JSON.stringify({ event: 'deuce.scheduler.pipeline.started', day, completed: [...completed], at: new Date().toISOString() }))
  for (const job of jobs) {
    if (completed.has(job.path)) {
      console.log(JSON.stringify({ event: 'deuce.scheduler.skipped', day, job: job.name, reason: 'already-completed' }))
      continue
    }
    if (!await runJob(job)) break
    completed.add(job.path)
    await saveState(day, completed)
  }
  console.log(JSON.stringify({ event: 'deuce.scheduler.pipeline.finished', day, complete: jobs.every(job => completed.has(job.path)), at: new Date().toISOString() }))
  schedulePipeline(false)
}

function schedulePipeline(allowCatchUp) {
  const plan = pipelinePlan(allowCatchUp)
  console.log(JSON.stringify({ event: 'deuce.scheduler.next', job: 'ATP → WTA → publication', day: plan.day, at: new Date(Date.now() + plan.wait).toISOString() }))
  setTimeout(() => {
    if (Date.now() - plan.scheduledAt > catchUpWindow) schedulePipeline(true)
    else void runPipeline(plan.day)
  }, plan.wait)
}

schedulePipeline(true)
