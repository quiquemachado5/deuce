import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path,import.meta.url),'utf8')
const [robots,caddy,compose,resource,maintenance,bootstrap,deployWorkflow,healthWorkflow,ciWorkflow]=await Promise.all([
  read('../app/robots.ts'),read('../ops/oracle/Caddyfile'),read('../compose.yaml'),
  read('../ops/vps/resource-check.sh'),read('../ops/vps/maintenance.sh'),read('../ops/vps/bootstrap.sh'),
  read('../.github/workflows/deploy-netcup.yml'),read('../.github/workflows/production-health.yml'),
  read('../.github/workflows/ci.yml'),
])

test('costly AI crawlers are rejected before Next while search indexing remains available',()=>{
  assert.match(robots,/GPTBot/)
  assert.match(robots,/userAgent: '\*', allow: '\/'/)
  assert.match(caddy,/header_regexp User-Agent/)
  assert.ok(caddy.indexOf('respond @expensiveBots 403')<caddy.indexOf('reverse_proxy web:3000'))
  assert.match(caddy,/header_up X-Real-IP \{remote_host\}/)
})

test('production deploy waits for CI and pins both commit and SSH host identity',()=>{
  assert.match(deployWorkflow,/workflows: \[Archive quality\]/)
  assert.match(deployWorkflow,/workflow_run\.conclusion == 'success'/)
  assert.match(deployWorkflow,/"deploy:\$EXPECTED_SHA"/)
  assert.doesNotMatch(deployWorkflow,/git -C \/opt\/deuce\/app/)
  assert.match(deployWorkflow,/node ops\/monitor\.mjs --check-only/)
  assert.match(deployWorkflow,/DEUCE_EXPECTED_COMMIT: \$\{\{ github\.event\.workflow_run\.head_sha \|\| github\.sha \}\}/)
  assert.match(deployWorkflow,/StrictHostKeyChecking=yes/)
  assert.match(deployWorkflow,/secrets\.DEUCE_VPS_KNOWN_HOSTS/)
  assert.match(healthWorkflow,/2,17,32,47/)
  assert.match(healthWorkflow,/DEUCE_EXPECTED_COMMIT:/)
})

test('browser checks reuse the verified build without a deprecated artifact download',()=>{
  assert.match(ciWorkflow,/npm run build[\s\S]*npm run test:browser/)
  assert.doesNotMatch(ciWorkflow,/actions\/download-artifact/)
  assert.doesNotMatch(ciWorkflow,/^  browser:/m)
})

test('reverse proxy has explicit confinement and resource ceilings',()=>{
  const proxy=compose.slice(compose.indexOf('  caddy:'))
  assert.match(proxy,/no-new-privileges:true/)
  assert.match(proxy,/cap_drop:\n\s+- ALL/)
  assert.match(proxy,/cap_add:\n\s+- NET_BIND_SERVICE/)
  assert.match(proxy,/mem_limit: 256m/)
  assert.match(proxy,/pids_limit: 128/)
})

test('host health and safe maintenance are scheduled without touching volumes',()=>{
  assert.match(resource,/host-status\.json/)
  assert.match(resource,/DEUCE_RESOURCE_CHECK_LOCK_HELD/)
  assert.match(resource,/\.State\.Status/)
  assert.match(resource,/proxy_state.*!= healthy/)
  assert.match(resource,/memory\.current/)
  assert.match(resource,/disk_used >= 85/)
  assert.match(maintenance,/docker builder prune/)
  assert.match(maintenance,/docker image prune/)
  assert.doesNotMatch(maintenance,/volume prune|system prune/)
  assert.match(bootstrap,/deuce-resource-check\.timer/)
  assert.match(bootstrap,/deuce-maintenance\.timer/)
})
