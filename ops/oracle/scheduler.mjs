const base = process.env.DEUCE_INTERNAL_URL || 'http://web:3000'
const secret = process.env.CRON_SECRET
if (!secret) throw new Error('CRON_SECRET is required')

const jobs = [
  { name: 'ATP refresh', hour: 4, path: '/api/cron/refresh' },
  { name: 'WTA refresh', hour: 6, path: '/api/cron/wta' },
  { name: 'validated publication', hour: 8, path: '/api/cron/publish' },
]

function millisecondsUntil(hour) {
  const now = new Date()
  const target = new Date(now)
  target.setUTCHours(hour, 0, 0, 0)
  if (target <= now) target.setUTCDate(target.getUTCDate() + 1)
  return target.getTime() - now.getTime()
}

async function run(job) {
  const startedAt = new Date().toISOString()
  try {
    const response = await fetch(`${base}${job.path}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(290_000),
    })
    const body = await response.text()
    console.log(JSON.stringify({ event: 'deuce.scheduler', job: job.name, startedAt, finishedAt: new Date().toISOString(), status: response.status, body: body.slice(0, 500) }))
  } catch (error) {
    console.error(JSON.stringify({ event: 'deuce.scheduler.failed', job: job.name, startedAt, finishedAt: new Date().toISOString(), error: error instanceof Error ? error.message : 'unknown' }))
  } finally {
    schedule(job)
  }
}

function schedule(job) {
  const wait = millisecondsUntil(job.hour)
  console.log(JSON.stringify({ event: 'deuce.scheduler.next', job: job.name, at: new Date(Date.now() + wait).toISOString() }))
  setTimeout(() => run(job), wait)
}

for (const job of jobs) schedule(job)
