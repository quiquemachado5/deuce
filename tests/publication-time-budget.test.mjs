import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')
const [runner, route, scheduler, recovery, internalRequest, deploy, workflow] = await Promise.all([
  read('../lib/isolated-publication.ts'),
  read('../app/api/cron/publish/route.ts'),
  read('../ops/oracle/scheduler.mjs'),
  read('../ops/recover-publication.mjs'),
  read('../ops/internal-request.mjs'),
  read('../ops/vps/deploy.sh'),
  read('../.github/workflows/deploy-netcup.yml'),
])

test('large archive publication deadlines remain bounded and ordered', () => {
  assert.match(runner, /timeoutMs=options\.timeoutMs\|\|1_800_000/)
  assert.match(route, /maxDuration = 1920/)
  assert.match(scheduler, /api\/cron\/publish[\s\S]*timeoutMs: 1_860_000/)
  assert.match(recovery, /timeoutMs: 1_860_000/)
  assert.match(internalRequest, /timeoutMs = 1_860_000/)
  assert.match(deploy, /for attempt in \{1\.\.420\}/)
  assert.match(deploy, /now-at<1920000/)
  assert.match(workflow, /timeout-minutes: 90/)
})
