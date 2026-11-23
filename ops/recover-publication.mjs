import { internalRequest } from './internal-request.mjs'
import { recoverableDailyPublicationFailure, recoverableStaleDataset } from './release-policy.mjs'

const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3)
const healthUrl = argument('health-url') || 'http://127.0.0.1:3000/api/health/deep'
const publishUrl = argument('publish-url') || new URL('/api/cron/publish', healthUrl).href
const secret = process.env.CRON_SECRET

const healthSecret=process.env.HEALTH_SECRET||process.env.METRICS_SECRET
const healthResponse = await fetch(healthUrl, {headers:healthSecret?{Authorization:'Bearer '+healthSecret}:{},signal: AbortSignal.timeout(30_000), cache: 'no-store' })
if (!healthResponse.ok) throw new Error(`Health endpoint: HTTP ${healthResponse.status}`)
const health = await healthResponse.json()

const staleDataset = recoverableStaleDataset(health)
if (!staleDataset && !recoverableDailyPublicationFailure(health)) {
  console.log(JSON.stringify({ status: 'not-needed' }))
} else {
  if (!secret) throw new Error('CRON_SECRET is required to repair publication state')
  if (staleDataset) {
    for (const route of ['/api/cron/refresh', '/api/cron/wta']) {
      const target = new URL(route, healthUrl).href
      let refreshed = false
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const response = await internalRequest(target, {
          headers: { Authorization: `Bearer ${secret}` }, timeoutMs: 300_000,
        })
        const body = JSON.parse(response.body || '{}')
        if (response.status === 200 && body.status === 'success') {
          console.log(JSON.stringify({ status: 'refreshed', route, updated: body.updated, pending: body.pending, calls: body.calls }))
          refreshed = true
          break
        }
        if (response.status === 503 && body.status === 'busy' && attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 5_000))
          continue
        }
        throw new Error(`Candidate ${route} failed: HTTP ${response.status}, ${String(body.status || 'unknown')}`)
      }
      if (!refreshed) throw new Error(`Candidate ${route} remained busy`)
    }
  }
  let repaired = false
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await internalRequest(publishUrl, {
      headers: { Authorization: `Bearer ${secret}` },
      timeoutMs: 2_760_000,
    })
    const body = JSON.parse(response.body || '{}')
    if (response.status === 200 && body.status === 'success') {
      console.log(JSON.stringify({ status: 'repaired', version: body.version, matches: body.matches, tours: body.tours }))
      repaired = true
      break
    }
    if (response.status === 503 && body.status === 'busy' && attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, 5_000))
      continue
    }
    throw new Error(`Candidate publication repair failed: HTTP ${response.status}`)
  }
  if (!repaired) throw new Error('Candidate publication repair remained busy')
}
