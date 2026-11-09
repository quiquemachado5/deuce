import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../ops/vps/deploy.sh', import.meta.url), 'utf8')
const watchdog = await readFile(new URL('../ops/vps/watchdog.sh', import.meta.url), 'utf8')
const seedRoute = await readFile(new URL('../app/api/cron/seed/route.ts', import.meta.url), 'utf8')
const publishRoute = await readFile(new URL('../app/api/cron/publish/route.ts', import.meta.url), 'utf8')
const scheduler = await readFile(new URL('../ops/oracle/scheduler.mjs', import.meta.url), 'utf8')
const compose = await readFile(new URL('../compose.yaml', import.meta.url), 'utf8')
const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8')
const bootstrap = await readFile(new URL('../ops/vps/bootstrap.sh', import.meta.url), 'utf8')

test('production image contains the bundled seed and Debian bootstrap supports Compose v2 packages', () => {
  assert.match(dockerfile, /COPY --from=builder --chown=nextjs:nodejs \/app\/data\/reading \.\/data\/reading/)
  assert.match(bootstrap, /compose_package=docker-compose-v2/)
  assert.match(bootstrap, /compose_package=docker-compose/)
  assert.doesNotMatch(bootstrap, /NOPASSWD\s*:\s*ALL/)
  assert.match(dockerfile, /--mount=type=cache,target=\/root\/\.npm,sharing=locked npm ci/)
  assert.match(dockerfile, /--mount=type=cache,target=\/app\/\.next\/cache,sharing=locked npm run build/)
})

test('production preflight and container confinement run before promotion', () => {
  const publicConfig = source.indexOf('node ops/vps/apply-public-env.mjs')
  const preflight = source.indexOf('node ops/vps/preflight.mjs')
  const fetch = source.indexOf('git fetch origin main')
  assert.ok(publicConfig >= 0 && publicConfig < preflight && preflight < fetch)
  assert.match(source.slice(0, fetch), /--network none/)
  assert.match(source.slice(0, fetch), /target=\/workspace,readonly/)
  assert.match(compose, /no-new-privileges:true/)
  assert.ok((compose.match(/cap_drop:/g) || []).length >= 2)
  const candidate = source.slice(source.indexOf('candidate_args=('), source.indexOf('docker "${candidate_args[@]}"'))
  assert.match(candidate, /--security-opt no-new-privileges/)
  assert.match(candidate, /--cap-drop ALL/)
  assert.match(candidate, /--read-only/)
  assert.match(candidate, /--tmpfs \/tmp:rw,noexec,nosuid,size=64m/)
  assert.match(candidate, /--pids-limit 256/)
  assert.match(candidate, /--env NODE_OPTIONS=--max-old-space-size=1536/)
  assert.match(compose, /web:[\s\S]*NODE_OPTIONS: --max-old-space-size=1536[\s\S]*scheduler:/)
  assert.ok((compose.match(/read_only: true/g) || []).length >= 3)
  assert.doesNotMatch(compose.slice(compose.indexOf('scheduler:'), compose.indexOf('caddy:')), /NODE_OPTIONS/)
})

test('the target commit reapplies its public configuration after fast-forward', () => {
  const applications = [...source.matchAll(/node ops\/vps\/apply-public-env\.mjs/g)].map(match => match.index)
  const preflights = [...source.matchAll(/node ops\/vps\/preflight\.mjs/g)].map(match => match.index)
  const fastForward = source.indexOf('git merge --ff-only origin/main')
  const commit = source.indexOf('commit="$(git rev-parse HEAD)"')
  assert.equal(applications.length, 2)
  assert.equal(preflights.length, 2)
  assert.ok(fastForward < applications[1] && applications[1] < preflights[1] && preflights[1] < commit)
})

test('a changed deployment script re-executes the approved target on its first run', () => {
  const runningBlob = source.indexOf('running_deploy_blob="$(git hash-object "${BASH_SOURCE[0]}")"')
  const fastForward = source.indexOf('git merge --ff-only origin/main')
  const targetBlob = source.indexOf('target_deploy_blob="$(git rev-parse HEAD:ops/vps/deploy.sh)"')
  const reexec = source.indexOf('exec "${ROOT}/ops/vps/deploy.sh"')
  const targetConfiguration = source.lastIndexOf('node ops/vps/apply-public-env.mjs')

  assert.ok(runningBlob >= 0 && runningBlob < fastForward)
  assert.ok(fastForward < targetBlob && targetBlob < reexec && reexec < targetConfiguration)
  assert.match(source.slice(targetBlob, reexec), /DEUCE_DEPLOY_REEXECUTED/)
  assert.match(source.slice(0, runningBlob), /DEUCE_DEPLOY_LOCK_INHERITED/)
  assert.match(source.slice(0, runningBlob), /readlink "\/proc\/\$\$\/fd\/9"/)
  assert.match(source.slice(0, runningBlob), /flock -n 9/)
})

test('successful deployments retain only the active and rollback images', () => {
  const cleanup = source.slice(source.indexOf('cleanup_old_images()'), source.indexOf('bootstrap_scheduler_started=false'))
  assert.match(cleanup, /candidate_image/)
  assert.match(cleanup, /previous_image/)
  assert.match(cleanup, /docker image rm/)
  assert.match(cleanup, /docker builder prune/)
  assert.ok(source.lastIndexOf('cleanup_old_images') > source.lastIndexOf('commit_release_markers'))
})

test('clean VPS resources are provisioned and owned by Compose', () => {
  assert.doesNotMatch(source, /docker network create|docker volume create/)
  const provision = source.indexOf('"${compose[@]}" create --no-build web scheduler')
  const candidate = source.indexOf('docker "${candidate_args[@]}"')
  assert.ok(provision >= 0 && provision < candidate)
  assert.match(source, /com\.docker\.compose\.project/)
})

test('first release keeps the scheduler in heartbeat mode through both gates', () => {
  const bootstrap = source.indexOf('DEUCE_SCHEDULER_HEARTBEAT_ONLY=1')
  const candidateGate = source.indexOf('candidate_verified=false')
  const promotedGate = source.indexOf('promoted=false')
  const normal = source.lastIndexOf('DEUCE_SCHEDULER_HEARTBEAT_ONLY=0')
  assert.ok(bootstrap >= 0 && bootstrap < candidateGate)
  assert.ok(promotedGate > candidateGate)
  assert.ok(normal > promotedGate)
  assert.match(source.slice(normal), /Normal scheduler did not publish a fresh healthy heartbeat/)
})

test('daily bootstrap allowance follows persisted health instead of release count', () => {
  const verification = source.slice(source.indexOf('verify_args=('), source.indexOf('candidate_verified=false'))
  assert.match(verification, /--allow-initial-daily-unavailable/)
  assert.doesNotMatch(verification, /first_release/)
})

test('a recoverable publication error is repaired by the candidate before either gate', () => {
  const seed = source.indexOf('/api/cron/seed')
  const repair = source.indexOf('/app/ops/recover-publication.mjs')
  const candidateGate = source.indexOf('candidate_verified=false')
  const promotedGate = source.indexOf('promoted=false')
  assert.ok(seed >= 0 && seed < repair && repair < candidateGate && candidateGate < promotedGate)
  assert.match(source.slice(repair, candidateGate), /Candidate could not repair the recoverable publication state/)
  assert.match(source.slice(repair, candidateGate), /api\/cron\/publish/)
})

test('deploy and watchdog share a lock before touching the stack', () => {
  const deployLock = source.indexOf('flock -n 9')
  const fetch = source.indexOf('git fetch origin main')
  const watchdogLock = watchdog.indexOf('flock -n -s 9')
  const watchdogStack = watchdog.indexOf('compose=(docker compose')
  assert.ok(deployLock >= 0 && deployLock < fetch)
  assert.ok(watchdogLock >= 0 && watchdogLock < watchdogStack)
  assert.match(source, /DEUCE_DEPLOY_LOCK_FILE:-\$\{STATE_DIR\}\/deploy\.lock/)
  assert.match(watchdog, /DEUCE_DEPLOY_LOCK_FILE:-\$\{STATE_DIR\}\/deploy\.lock/)
  assert.match(watchdog, /no release has been promoted yet/)
})

test('deploy rejects every non-ignored checkout change before building the image', () => {
  assert.match(source, /git status --porcelain\)"/)
  assert.doesNotMatch(source, /--untracked-files=no/)
  assert.ok(source.indexOf('git status --porcelain') < source.indexOf('build web'))
})

test('CI-triggered deployment accepts only the exact approved main commit', () => {
  assert.match(source,/DEUCE_EXPECTED_COMMIT/)
  assert.match(source,/git rev-parse origin\/main/)
  assert.ok(source.indexOf('remote_commit="$(git rev-parse origin/main)"') < source.indexOf('git merge --ff-only origin/main'))
  assert.match(source,/not the CI-approved/)
})

test('a stale offsite backup is rebuilt and restore-tested before the release image', () => {
  const gate = source.indexOf('# A release must never build on top of an unprotected archive')
  const freshness = source.indexOf('node ops/vps/recovery-freshness.mjs')
  const backup = source.indexOf('node ops/vps/run-with-production-env.mjs -- ops/vps/backup.sh')
  const restore = source.indexOf('node ops/vps/run-with-production-env.mjs -- ops/vps/restore-drill.sh')
  const build = source.indexOf('"${compose[@]}" build web')
  assert.ok(gate >= 0 && gate < freshness && freshness < backup && backup < restore && restore < build)
  assert.match(source.slice(gate, build), /DEUCE_BACKUP_MAX_AGE_HOURS:-36/)
  assert.match(source.slice(gate, build), /first_release/)
})

test('every candidate migrates incompatible storage and can restore its prior pointer', () => {
  const seed = source.indexOf('/api/cron/seed')
  const candidateGate = source.indexOf('candidate_verified=false')
  assert.ok(seed >= 0 && seed < candidateGate)
  assert.match(source, /X-DEUCE-Deploy-Backup/)
  assert.match(seedRoute, /prepareDeploymentBackup/)
  assert.match(source, /restore_archive_backup/)
  assert.match(source, /manifest pointer last/)
  assert.match(seedRoute, /never use it for rollback/)
  assert.match(seedRoute, /\.stale-\$\{Date\.now\(\)\}-\$\{process\.pid\}/)
  assert.match(seedRoute, /current\.equals\(saved\)/)
})

test('scheduler recreation is guarded by a fresh post-start heartbeat', () => {
  assert.match(source, /ps --all -q web/)
  assert.match(source, /if ! SOURCE_COMMIT=.*DEUCE_SCHEDULER_HEARTBEAT_ONLY=1/)
  assert.ok((source.match(/wait_for_fresh_scheduler/g) || []).length >= 4)
  assert.match(source, /Recreated scheduler did not publish a fresh healthy heartbeat/)
})

test('candidate tolerates the suspended host probe but promotion proves Caddy and refreshes it', () => {
  assert.match(source, /candidate_verify_args=.*--allow-host-issue/)
  const caddyStart = source.indexOf('up -d --no-build --force-recreate scheduler caddy')
  const caddyGate = source.indexOf('if ! wait_for_caddy', caddyStart)
  const hostProbe = source.indexOf('DEUCE_RESOURCE_CHECK_LOCK_HELD=1', caddyGate)
  const promotedGate = source.indexOf('promoted=false', hostProbe)
  assert.ok(caddyStart >= 0 && caddyStart < caddyGate && caddyGate < hostProbe && hostProbe < promotedGate)
  assert.match(compose, /caddy:[\s\S]*healthcheck:[\s\S]*caddy", "validate"/)
})

test('archive mutation is quiesced before backup and resumed coherently on failure', () => {
  const pause = source.indexOf('if ! pause_previous_scheduler')
  const seed = source.indexOf('/api/cron/seed')
  const candidateGate = source.indexOf('candidate_verified=false')
  assert.ok(pause >= 0 && pause < seed && seed < candidateGate)
  const pauseFunction = source.slice(source.indexOf('pause_previous_scheduler()'), source.indexOf('resume_previous_scheduler()'))
  assert.match(pauseFunction, /stop scheduler/)
  assert.match(pauseFunction, /wait_for_archive_idle/)

  const cleanup = source.slice(source.indexOf('cleanup_candidate()'), source.indexOf('trap cleanup_candidate'))
  assert.ok(cleanup.indexOf('quiesce_candidate_scheduler') < cleanup.indexOf('restore_archive_backup'))
  assert.ok(cleanup.indexOf('restore_archive_backup') < cleanup.indexOf('resume_previous_scheduler'))
  assert.match(cleanup, /resume_previous_scheduler/)

  const quiesce = source.slice(source.indexOf('quiesce_candidate_scheduler()'), source.indexOf('cleanup_candidate()'))
  assert.match(quiesce, /failed to stop the candidate scheduler/)
  assert.match(quiesce, /\.State\.Running/)
  assert.doesNotMatch(quiesce, /stop scheduler[^\n]*\|\| true/)

  const rollback = source.slice(source.indexOf('rollback()'), source.indexOf('if [[ "${first_release}" == true ]]', source.indexOf('rollback()')))
  assert.ok(rollback.indexOf('quiesce_candidate_scheduler') < rollback.indexOf('restore_archive_backup'))
  assert.ok(rollback.indexOf('restore_archive_backup') < rollback.indexOf('up -d --no-build --force-recreate web scheduler caddy'))
  assert.match(rollback, /wait_for_fresh_scheduler "\$\{rollback_started_ms\}" "\$\{previous_image\}" "\$\{previous_commit\}"/)
  assert.ok(rollback.indexOf('previous_scheduler_paused=false') < rollback.indexOf('return 0'))
})

test('rollback owns recovery and leaves scheduler stopped when previous health recovery fails', () => {
  const cleanup = source.slice(source.indexOf('cleanup_candidate()'), source.indexOf('trap cleanup_candidate'))
  const ownedBranch = cleanup.slice(cleanup.indexOf('rollback_recovery_owned'))
  assert.ok(ownedBranch.indexOf('stop_scheduler_fail_closed') < ownedBranch.indexOf('return 0'))
  assert.doesNotMatch(ownedBranch.slice(0, ownedBranch.indexOf('return 0')), /resume_previous_scheduler/)

  const rollback = source.slice(source.indexOf('rollback()'), source.indexOf('if [[ "${first_release}" == true ]]', source.indexOf('rollback()')))
  const ownership = rollback.indexOf('rollback_recovery_owned=true')
  const heartbeatOnly = rollback.indexOf('DEUCE_SCHEDULER_HEARTBEAT_ONLY=1')
  const webGate = rollback.indexOf('if [[ "${web_restored}" != true ]]')
  const marker = rollback.indexOf('${STATE_DIR}/active-image')
  const normal = rollback.indexOf('DEUCE_SCHEDULER_HEARTBEAT_ONLY=0')
  assert.ok(ownership >= 0 && ownership < heartbeatOnly && heartbeatOnly < webGate && webGate < marker && marker < normal)
  assert.match(rollback.slice(normal), /DEUCE_SCHEDULER_PIPELINE_DELAY_MS=600000/)
  assert.ok((rollback.match(/stop_scheduler_fail_closed/g) || []).length >= 5)
  assert.ok(rollback.indexOf('rollback_recovery_succeeded=true') > normal)
})

test('seed, WTA bootstrap and publication share the provider archive lease', () => {
  const seedLease = seedRoute.indexOf("acquireArchiveLease('tennis-provider', 600)")
  const backup = seedRoute.indexOf('prepareDeploymentBackup(deploymentBackup)')
  const wtaBootstrap = seedRoute.indexOf('materializeBundledWtaArchive', seedLease)
  assert.ok(seedLease >= 0 && seedLease < backup && backup < wtaBootstrap)
  assert.match(seedRoute.slice(seedLease), /finally \{[\s\S]*await release\(\)/)

  const publishLease = publishRoute.indexOf("acquireArchiveLease('tennis-provider',600)")
  const publishRunning = publishRoute.indexOf("cloudWrite('publish-status'", publishLease)
  assert.ok(publishLease >= 0 && publishLease < publishRunning)
  assert.match(publishRoute.slice(publishLease), /finally \{[\s\S]*await release\(\)/)
})

test('normal scheduler cannot mutate the archive before deployment finalization', () => {
  const normal = source.lastIndexOf('DEUCE_SCHEDULER_HEARTBEAT_ONLY=0')
  const markers = source.indexOf('if ! commit_release_markers', normal)
  const discard = source.indexOf('discard_archive_backup', markers)
  assert.ok(normal >= 0 && normal < markers && markers < discard)
  assert.match(source.slice(normal, markers), /DEUCE_SCHEDULER_PIPELINE_DELAY_MS=600000/)
  const delayBranch = scheduler.slice(scheduler.indexOf('if (pipelineStartupDelay > 0)'))
  assert.ok(delayBranch.indexOf('await persist()') < delayBranch.indexOf('setTimeout(() => { void schedulePipeline(true) }'))
})

test('release markers are atomic, authoritative last, and retain rollback until committed', () => {
  const writeMarkerFunction = source.slice(source.indexOf('write_release_marker()'), source.indexOf('commit_release_markers()'))
  const markerFunction = source.slice(source.indexOf('commit_release_markers()'), source.indexOf('restore_archive_backup()'))
  assert.doesNotMatch(writeMarkerFunction, /local destination=.*temporary="\$\{destination\}/)
  assert.match(writeMarkerFunction, /local destination="\$1" value="\$2" temporary\n\s+temporary="\$\{destination\}/)
  const activeCommit = markerFunction.indexOf('${STATE_DIR}/active-commit')
  const activeImage = markerFunction.indexOf('${STATE_DIR}/active-image')
  assert.ok(activeCommit >= 0 && activeCommit < activeImage)
  assert.match(markerFunction, /sync -f "\$\{STATE_DIR\}"/)

  const finalization = source.slice(source.lastIndexOf('if ! commit_release_markers'))
  const rollback = finalization.indexOf('rollback "${candidate_image}"')
  const discard = finalization.indexOf('discard_archive_backup')
  assert.ok(rollback >= 0 && rollback < discard)
  assert.doesNotMatch(finalization.slice(discard), /rollback "\$\{candidate_image\}"/)
  const discardFunction = source.slice(source.indexOf('discard_archive_backup()'), source.indexOf('wait_for_fresh_scheduler()'))
  assert.ok(discardFunction.indexOf('archive_restore_needed=false') < discardFunction.indexOf('docker exec'))
})

test('a failed first promotion is cleaned and retries as a first release', () => {
  const classification = source.slice(source.indexOf('first_release=true'), source.indexOf('echo "Building immutable release image'))
  assert.match(classification, /if \[\[ -s "\$\{STATE_DIR\}\/active-image" \]\]/)
  assert.match(classification, /first_release=false/)
  assert.doesNotMatch(classification, /known_web_id[^\n]*first_release=false|first_release=false[^\n]*known_web_id/)
  assert.match(classification, /\.State\.Running/)
  assert.match(classification, /rm --force --stop web scheduler caddy/)

  const rollback = source.indexOf('rollback()')
  const noPrevious = source.slice(source.indexOf('if [[ -z "${previous_image}" ]]', rollback), source.indexOf('local rollback_started_ms', rollback))
  assert.match(noPrevious, /Removing the failed first-release containers for a clean retry/)
  assert.match(noPrevious, /rm --force --stop web scheduler caddy/)
  assert.ok(noPrevious.indexOf('rm --force --stop') < noPrevious.indexOf('return 1'))
})
