import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path,import.meta.url),'utf8')
const [robots,caddy,compose,resource,maintenance,bootstrap,deployWorkflow,healthWorkflow,ciWorkflow,prometheus,alerts,caddyImage,deploy]=await Promise.all([
  read('../app/robots.ts'),read('../ops/oracle/Caddyfile'),read('../compose.yaml'),
  read('../ops/vps/resource-check.sh'),read('../ops/vps/maintenance.sh'),read('../ops/vps/bootstrap.sh'),
  read('../.github/workflows/deploy-netcup.yml'),read('../.github/workflows/production-health.yml'),
  read('../.github/workflows/ci.yml'),
  read('../ops/observability/prometheus.yml'),read('../ops/observability/alerts.yml'),
  read('../ops/oracle/Dockerfile.caddy'),read('../ops/vps/deploy.sh'),
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
  const proxyOnly=proxy.slice(0,proxy.indexOf('\n  prometheus:'))
  assert.match(proxy,/no-new-privileges:true/)
  assert.match(proxy,/cap_drop:\n\s+- ALL/)
  assert.match(proxy,/cap_add:\n\s+- NET_BIND_SERVICE/)
  assert.match(proxy,/mem_limit: 256m/)
  assert.match(proxy,/pids_limit: 128/)
  assert.doesNotMatch(proxyOnly,/env_file:/)
  assert.match(proxyOnly,/DEUCE_HOST: \$\{DEUCE_HOST:/)
})

test('edge rate limiting and durable metrics are validated before promotion',()=>{
  assert.match(caddyImage,/FROM caddy:2\.10\.2-builder-alpine@sha256:[a-f0-9]{64}/)
  assert.match(caddyImage,/FROM caddy:2\.10\.2-alpine@sha256:[a-f0-9]{64}/)
  assert.match(caddyImage,/ARG RATE_LIMIT_VERSION=5625512f24f6f59d6f64fb3aafe5eecff0b286db/)
  assert.match(caddyImage,/caddy-ratelimit@\$\{RATE_LIMIT_VERSION\}/)
  assert.match(caddyImage,/org\.opencontainers\.image\.revision="\$\{DEUCE_CADDY_SOURCE_SHA256\}"/)
  assert.match(ciWorkflow,/caddy-validate:/)
  assert.match(ciWorkflow,/caddy-publish:/)
  assert.equal((ciWorkflow.match(/--file ops\/oracle\/Dockerfile\.caddy/g) ?? []).length,2)
  assert.match(ciWorkflow,/packages: write/)
  assert.match(ciWorkflow,/--sbom=true/)
  assert.match(ciWorkflow,/Require anonymous production pulls/)
  assert.match(caddy,/rate_limit \{/)
  assert.match(caddy,/zone public_data_api/)
  assert.match(caddy,/ipv6_prefix 64/)
  assert.match(caddy,/distributed \{/)
  assert.match(prometheus,/credentials_file: \/run\/secrets\/deuce_metrics_secret/)
  assert.match(prometheus,/targets: \[caddy:2019\]/)
  assert.match(alerts,/DeuceRepeatedAuthenticationFailures/)
  assert.match(compose,/prometheus:v3\.5\.0/)
  assert.match(compose,/storage\.tsdb\.retention\.size=256MB/)
  const metricsStart=compose.indexOf('  prometheus:')
  const metricsService=compose.slice(metricsStart,compose.indexOf('\nvolumes:',metricsStart))
  assert.doesNotMatch(metricsService,/env_file:/)
  assert.match(metricsService,/secrets:\n\s+- deuce_metrics_secret/)
  assert.match(compose,/deuce_metrics_secret:\n\s+environment: METRICS_SECRET/)
  assert.doesNotMatch(metricsService,/METRICS_SECRET: \$\{METRICS_SECRET:/)
  assert.doesNotMatch(metricsService,/read_only: true/)
  assert.match(metricsService,/no-new-privileges:true/)
  assert.match(metricsService,/cap_drop:\n\s+- ALL/)
  assert.doesNotMatch(compose,/9090:9090/)
  assert.match(deploy,/prepare_caddy_image/)
  assert.match(deploy,/docker pull "\$\{caddy_tag\}"/)
  assert.match(deploy,/DEUCE_ALLOW_CADDY_SOURCE_BUILD/)
  assert.ok(deploy.indexOf('prepare_caddy_image') < deploy.indexOf('force-recreate scheduler caddy'))
  assert.ok(deploy.indexOf('promtool prometheus check config') < deploy.indexOf('force-recreate scheduler caddy'))
  assert.match(deploy,/start_prometheus_best_effort/)
  assert.match(deploy,/wait_for_prometheus/)
  assert.ok(deploy.lastIndexOf('if ! wait_for_prometheus') < deploy.lastIndexOf('failed its host resource probe'))
})

test('host health and safe maintenance are scheduled without touching volumes',()=>{
  assert.match(resource,/host-status\.json/)
  assert.match(resource,/DEUCE_RESOURCE_CHECK_LOCK_HELD/)
  assert.match(resource,/\.State\.Status/)
  assert.match(resource,/proxy_state.*!= healthy/)
  assert.match(resource,/"metrics":"%s"/)
  assert.doesNotMatch(resource,/metrics_state.*!= healthy/)
  assert.match(resource,/memory\.current/)
  assert.match(resource,/disk_used >= 85/)
  assert.match(maintenance,/docker builder prune/)
  assert.match(maintenance,/docker image prune/)
  assert.doesNotMatch(maintenance,/volume prune|system prune/)
  assert.match(bootstrap,/deuce-resource-check\.timer/)
  assert.match(bootstrap,/deuce-maintenance\.timer/)
})
