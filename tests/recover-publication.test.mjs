import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

test('stale candidate refreshes ATP and WTA before publishing', async () => {
  const paths = []
  const server = createServer((request, response) => {
    paths.push(request.url)
    response.setHeader('Content-Type', 'application/json')
    if (request.url === '/api/health/deep') {
      response.end(JSON.stringify({ status: 'degraded', healthIssues: ['dataset-stale', 'daily-update'], storage: { available: true } }))
    } else if (request.headers.authorization !== 'Bearer test-secret') {
      response.writeHead(401).end('{}')
    } else {
      response.end(JSON.stringify({ status: 'success', updated: 1, calls: 4 }))
    }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const base = `http://127.0.0.1:${server.address().port}`
    await run(process.execPath, ['ops/recover-publication.mjs', `--health-url=${base}/api/health/deep`, `--publish-url=${base}/api/cron/publish`],
      { cwd: process.cwd(), env: { ...process.env, CRON_SECRET: 'test-secret' }, timeout: 10_000 })
    assert.deepEqual(paths, ['/api/health/deep', '/api/cron/refresh', '/api/cron/wta', '/api/cron/publish'])
  } finally {
    server.close()
  }
})
