#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${DEUCE_ROOT:-/opt/deuce/app}"
REPOSITORY="${DEUCE_REPOSITORY:-https://github.com/quiquemachado5/deuce.git}"
STATE_DIR="${DEUCE_DEPLOY_STATE_DIR:-/opt/deuce/deployments}"
LOCK_FILE="${DEUCE_DEPLOY_LOCK_FILE:-${STATE_DIR}/deploy.lock}"

install -d -m 0750 "${STATE_DIR}"
if ! command -v flock >/dev/null 2>&1; then
  echo "flock is required to serialize deployments and the watchdog." >&2
  exit 1
fi
if [[ ! -e "${LOCK_FILE}" ]]; then (umask 007; : >"${LOCK_FILE}"); fi
chmod 0660 "${LOCK_FILE}"
exec 9<>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "Another deployment or watchdog run is active; refusing concurrent deployment." >&2
  exit 1
fi

if [[ ! -d "${ROOT}/.git" ]]; then
  git clone --branch main --single-branch "${REPOSITORY}" "${ROOT}"
fi

cd "${ROOT}"
if [[ ! -f .env.production ]]; then
  echo "Missing ${ROOT}/.env.production." >&2
  exit 1
fi
docker run --rm --network none --user "$(id -u):$(id -g)" \
  --mount "type=bind,source=${ROOT},target=/workspace" \
  --workdir /workspace node:24-bookworm-slim \
  node ops/vps/apply-public-env.mjs --env=.env.production --config=ops/vps/production-public.env
docker run --rm --network none \
  --mount "type=bind,source=${ROOT},target=/workspace,readonly" \
  --workdir /workspace node:24-bookworm-slim \
  node ops/vps/preflight.mjs --env=.env.production --root=/workspace
if [[ -n "$(git status --porcelain)" ]]; then
  echo "The deployment checkout has tracked or untracked files; refusing to mix them with a release." >&2
  exit 1
fi

git fetch origin main
expected_commit="${DEUCE_EXPECTED_COMMIT:-}"
if [[ -n "${expected_commit}" ]]; then
  if [[ ! "${expected_commit}" =~ ^[a-f0-9]{40}$ ]]; then
    echo "DEUCE_EXPECTED_COMMIT must be a full lowercase Git commit." >&2
    exit 1
  fi
  remote_commit="$(git rev-parse origin/main)"
  if [[ "${remote_commit}" != "${expected_commit}" ]]; then
    echo "origin/main is ${remote_commit}, not the CI-approved ${expected_commit}; refusing deployment." >&2
    exit 1
  fi
fi
git checkout main
git merge --ff-only origin/main

commit="$(git rev-parse HEAD)"
if [[ -n "${expected_commit}" && "${commit}" != "${expected_commit}" ]]; then
  echo "Deployment checkout is ${commit}, not the CI-approved ${expected_commit}." >&2
  exit 1
fi
short="${commit:0:12}"
repository="${DEUCE_IMAGE_REPOSITORY:-deuce-web}"
candidate_image="${repository}:${commit}"
candidate="deuce-candidate-${short}"
compose=(docker compose --env-file .env.production)

first_release=true
previous_image=""
previous_commit=""
if [[ -s "${STATE_DIR}/active-image" ]]; then
  previous_image="$(<"${STATE_DIR}/active-image")"
  if [[ -z "${previous_image}" ]] || ! docker image inspect "${previous_image}" >/dev/null 2>&1; then
    echo "The promoted image marker is invalid or its immutable image is missing: ${previous_image:-empty}." >&2
    exit 1
  fi
  previous_commit="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "${previous_image}")"
  if [[ -z "${previous_commit}" ]]; then
    echo "The promoted image has no immutable revision label: ${previous_image}." >&2
    exit 1
  fi
  first_release=false
else
  # A stopped Compose container is not proof of a promoted release: it can be
  # residue from a failed first attempt. Remove that residue so the retry keeps
  # bootstrap heartbeat mode and the initial daily-status gate. A running web
  # without the durable marker is ambiguous and requires operator recovery.
  known_web_id="$("${compose[@]}" ps --all -q web 2>/dev/null || true)"
  if [[ -n "${known_web_id}" ]]; then
    if [[ "$(docker inspect --format '{{.State.Running}}' "${known_web_id}")" == "true" ]]; then
      echo "A running web container exists without ${STATE_DIR}/active-image; refusing an ambiguous deployment." >&2
      exit 1
    fi
    SOURCE_COMMIT="${commit}" DEUCE_WEB_IMAGE="${candidate_image}" \
      "${compose[@]}" rm --force --stop web scheduler caddy >/dev/null 2>&1 || true
  fi
fi

echo "Building immutable release image ${candidate_image}."
SOURCE_COMMIT="${commit}" DEUCE_WEB_IMAGE="${candidate_image}" "${compose[@]}" build web
revision="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "${candidate_image}")"
if [[ "${revision}" != "${commit}" ]]; then
  echo "Image revision label does not match ${commit}." >&2
  exit 1
fi

# Compose owns and labels the stable network and archive volume. On a clean
# server create the stopped service definitions before attaching the candidate;
# manually created resources are intentionally rejected by Compose.
if [[ "${first_release}" == true ]]; then
  SOURCE_COMMIT="${commit}" DEUCE_WEB_IMAGE="${candidate_image}" "${compose[@]}" create --no-build web scheduler >/dev/null
fi
network_project="$(docker network inspect --format '{{ index .Labels "com.docker.compose.project" }}' deuce_default)"
volume_project="$(docker volume inspect --format '{{ index .Labels "com.docker.compose.project" }}' deuce_archive)"
if [[ "${network_project}" != "deuce" || "${volume_project}" != "deuce" ]]; then
  echo "Compose resources are missing their deuce project ownership labels." >&2
  exit 1
fi
if docker container inspect "${candidate}" >/dev/null 2>&1; then docker container rm --force "${candidate}" >/dev/null; fi

candidate_args=(
  run --detach --name "${candidate}"
  --network deuce_default
  --security-opt no-new-privileges
  --cap-drop ALL
  --read-only
  --tmpfs /tmp:rw,noexec,nosuid,size=64m
  --pids-limit 256
  --memory 2g
  --cpus 1.5
  --env-file .env.production
  --env DEUCE_ARCHIVE_DIR=/app/.deuce-archive
  --env NODE_ENV=production
  --env NODE_OPTIONS=--max-old-space-size=1536
  --env PORT=3000
  --mount type=volume,source=deuce_archive,target=/app/.deuce-archive
  --mount type=volume,source=deuce_next_cache,target=/app/.next/cache
  --label "com.deuce.release-candidate=${commit}"
)
if [[ "${first_release}" == true ]]; then
  candidate_args+=(--network-alias web)
fi
docker "${candidate_args[@]}" "${candidate_image}" >/dev/null

cleanup_old_images() {
  local image
  while IFS= read -r image; do
    [[ -z "${image}" || "${image}" == "${candidate_image}" || "${image}" == "${previous_image}" ]] && continue
    docker image rm "${image}" >/dev/null 2>&1 || true
  done < <(docker image ls --filter "reference=${repository}:*" --format '{{.Repository}}:{{.Tag}}')
  docker builder prune --force --filter 'until=168h' >/dev/null 2>&1 || true
}

bootstrap_scheduler_started=false
candidate_phase_complete=false
archive_restore_needed=false
archive_backup="/app/.deuce-archive/.deploy-backup-${commit}"
previous_scheduler_was_running=false
previous_scheduler_paused=false
rollback_recovery_owned=false
rollback_recovery_succeeded=false

write_release_marker() {
  local destination="$1" value="$2" temporary
  temporary="${destination}.${commit}.$$.tmp"
  if ! (umask 027; printf '%s\n' "${value}" >"${temporary}") || ! sync -f "${temporary}" || ! mv -f "${temporary}" "${destination}"; then
    rm -f "${temporary}"
    return 1
  fi
}

commit_release_markers() {
  # active-image is the durable proof that a release was promoted, so publish
  # it last. A failure before that point leaves the previous release
  # authoritative and the archive rollback snapshot intact.
  if [[ -n "${previous_image}" && "${previous_image}" != "${candidate_image}" ]]; then
    if ! write_release_marker "${STATE_DIR}/previous-image" "${previous_image}"; then return 1; fi
  fi
  if ! write_release_marker "${STATE_DIR}/active-commit" "${commit}"; then return 1; fi
  if ! write_release_marker "${STATE_DIR}/active-image" "${candidate_image}"; then return 1; fi
  sync -f "${STATE_DIR}"
}

restore_archive_backup() {
  if [[ "${archive_restore_needed}" != true ]]; then return 0; fi
  docker exec "${candidate}" node -e '
    const {copyFile,readFile,rename,rm}=require("node:fs/promises"),{join}=require("node:path");
    (async()=>{const root=process.env.DEUCE_ARCHIVE_DIR,backup=process.argv[1];let meta;
      try{meta=JSON.parse(await readFile(join(backup,"meta.json"),"utf8"))}catch(error){if(error.code==="ENOENT")return;throw error}
      for(const name of meta.names){const target=join(root,name);if(meta.existing.includes(name)){const temporary=join(root,`.${name}.${process.pid}.restore`);await copyFile(join(backup,name),temporary);await rename(temporary,target)}else await rm(target,{force:true})}
      await rm(backup,{recursive:true,force:true});})().catch(error=>{console.error(error);process.exit(1)});' "${archive_backup}"
  archive_restore_needed=false
}

discard_archive_backup() {
  if [[ "${archive_restore_needed}" != true ]]; then return 0; fi
  # This is called only after active-image is durably committed. From that
  # point a leftover backup is harmless cleanup state and must never make the
  # promoted release roll back.
  archive_restore_needed=false
  docker exec "${candidate}" node -e 'require("node:fs/promises").rm(process.argv[1],{recursive:true,force:true}).catch(()=>process.exit(1))' "${archive_backup}"
}

wait_for_fresh_scheduler() {
  local after_ms="$1" image="${2:-${candidate_image}}" revision="${3:-${commit}}" scheduler_id=""
  for attempt in {1..60}; do
    scheduler_id="$(SOURCE_COMMIT="${revision}" DEUCE_WEB_IMAGE="${image}" "${compose[@]}" ps -q scheduler 2>/dev/null || true)"
    if [[ -n "${scheduler_id}" ]] \
      && [[ "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "${scheduler_id}")" == "healthy" ]] \
      && docker exec "${scheduler_id}" node -e '
        const fs=require("node:fs"),path=(process.env.DEUCE_ARCHIVE_DIR||"/app/.deuce-archive")+"/.scheduler/state.json";
        const state=JSON.parse(fs.readFileSync(path,"utf8"));if(!state.heartbeatAt||Date.parse(state.heartbeatAt)<Number(process.argv[1]))process.exit(1);' "${after_ms}"; then
      return 0
    fi
    sleep 5
  done
  SOURCE_COMMIT="${revision}" DEUCE_WEB_IMAGE="${image}" "${compose[@]}" logs --tail=200 scheduler >&2 || true
  return 1
}

wait_for_caddy() {
  local caddy_id=""
  for attempt in {1..30}; do
    caddy_id="$("${compose[@]}" ps -q caddy 2>/dev/null || true)"
    if [[ -n "${caddy_id}" ]] \
      && [[ "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "${caddy_id}" 2>/dev/null || echo missing)" == healthy ]]; then
      return 0
    fi
    sleep 2
  done
  "${compose[@]}" logs --tail=200 caddy >&2 || true
  return 1
}

wait_for_archive_idle() {
  for attempt in {1..84}; do
    if docker exec "${candidate}" node -e '
      const {readFile}=require("node:fs/promises"),{join}=require("node:path");
      (async()=>{const root=process.env.DEUCE_ARCHIVE_DIR,now=Date.now();
        try{const lease=JSON.parse(await readFile(join(root,".lease-tennis-provider.lock"),"utf8"));if(!lease.expiresAt||Date.parse(lease.expiresAt)>now)process.exit(1)}catch(error){if(error.code!=="ENOENT")process.exit(1)}
        for(const name of ["publish-status.json","seed-status.json"]){try{const row=JSON.parse(await readFile(join(root,name),"utf8"));if(row.status==="running"){const at=Date.parse(row.attemptAt||row.at||"");if(!Number.isFinite(at)||now-at<900000)process.exit(1)}}catch(error){if(error.code!=="ENOENT")process.exit(1)}}
      })().catch(()=>process.exit(1));'; then
      return 0
    fi
    sleep 5
  done
  echo "Archive mutations did not become idle after the active scheduler was paused." >&2
  return 1
}

pause_previous_scheduler() {
  if [[ "${first_release}" == true ]]; then return 0; fi
  local scheduler_id
  scheduler_id="$(SOURCE_COMMIT="${previous_commit}" DEUCE_WEB_IMAGE="${previous_image}" "${compose[@]}" ps -q scheduler 2>/dev/null || true)"
  if [[ -n "${scheduler_id}" && "$(docker inspect --format '{{.State.Running}}' "${scheduler_id}")" == "true" ]]; then
    previous_scheduler_was_running=true
    previous_scheduler_paused=true
    if ! SOURCE_COMMIT="${previous_commit}" DEUCE_WEB_IMAGE="${previous_image}" "${compose[@]}" stop scheduler >/dev/null; then
      echo "Failed to pause the previously promoted scheduler." >&2
      return 1
    fi
    if [[ "$(docker inspect --format '{{.State.Running}}' "${scheduler_id}" 2>/dev/null || echo false)" == "true" ]]; then
      echo "The previously promoted scheduler is still running after stop." >&2
      return 1
    fi
  fi
  wait_for_archive_idle
}

resume_previous_scheduler() {
  if [[ "${previous_scheduler_paused}" != true ]]; then return 0; fi
  if [[ "${previous_scheduler_was_running}" != true ]]; then
    previous_scheduler_paused=false
    return 0
  fi
  local resumed_at
  resumed_at="$(($(date +%s) * 1000))"
  if ! SOURCE_COMMIT="${previous_commit}" DEUCE_WEB_IMAGE="${previous_image}" DEUCE_SCHEDULER_HEARTBEAT_ONLY=0 \
    "${compose[@]}" up -d --no-build --no-deps --force-recreate scheduler; then
    echo "CRITICAL: failed to resume the previous scheduler." >&2
    return 1
  fi
  if ! wait_for_fresh_scheduler "${resumed_at}" "${previous_image}" "${previous_commit}"; then
    echo "CRITICAL: the resumed previous scheduler did not publish a fresh heartbeat." >&2
    return 1
  fi
  previous_scheduler_paused=false
}

quiesce_candidate_scheduler() {
  local scheduler_id
  if ! SOURCE_COMMIT="${commit}" DEUCE_WEB_IMAGE="${candidate_image}" DEUCE_SCHEDULER_HEARTBEAT_ONLY=1 \
    "${compose[@]}" stop scheduler >/dev/null 2>&1; then
    echo "CRITICAL: failed to stop the candidate scheduler before archive rollback." >&2
    return 1
  fi
  scheduler_id="$(SOURCE_COMMIT="${commit}" DEUCE_WEB_IMAGE="${candidate_image}" "${compose[@]}" ps --all -q scheduler 2>/dev/null || true)"
  if [[ -n "${scheduler_id}" && "$(docker inspect --format '{{.State.Running}}' "${scheduler_id}" 2>/dev/null || echo false)" == "true" ]]; then
    echo "CRITICAL: candidate scheduler is still running after stop." >&2
    return 1
  fi
  bootstrap_scheduler_started=false
  if [[ "${first_release}" != true ]] && ! wait_for_archive_idle; then
    echo "CRITICAL: candidate archive mutation did not stop before rollback." >&2
    return 1
  fi
}

stop_scheduler_fail_closed() {
  local image="${1:-${candidate_image}}" revision="${2:-${commit}}" scheduler_id="" running_id=""
  if ! SOURCE_COMMIT="${revision}" DEUCE_WEB_IMAGE="${image}" "${compose[@]}" stop scheduler >/dev/null 2>&1; then
    echo "Recovery could not stop the scheduler through Compose; forcing container removal." >&2
  fi
  scheduler_id="$(docker ps -aq --filter 'label=com.docker.compose.project=deuce' --filter 'label=com.docker.compose.service=scheduler' | head -n 1)"
  if [[ -n "${scheduler_id}" && "$(docker inspect --format '{{.State.Running}}' "${scheduler_id}" 2>/dev/null || echo false)" == "true" ]]; then
    docker container rm --force "${scheduler_id}" >/dev/null 2>&1 || true
  fi
  running_id="$(docker ps -q --filter 'label=com.docker.compose.project=deuce' --filter 'label=com.docker.compose.service=scheduler' | head -n 1)"
  if [[ -n "${running_id}" ]]; then
    echo "CRITICAL: scheduler ${running_id} is still running after fail-closed recovery." >&2
    return 1
  fi
  if [[ "${first_release}" != true ]] && ! wait_for_archive_idle; then
    echo "CRITICAL: an archive mutation remained active after fail-closed scheduler shutdown." >&2
    return 1
  fi
}

cleanup_candidate() {
  if [[ "${rollback_recovery_owned}" == true ]]; then
    # Once rollback begins, this trap may only enforce fail-closed state and
    # remove the isolated candidate. It must never reactivate the prior scheduler.
    if [[ "${rollback_recovery_succeeded}" != true ]]; then
      stop_scheduler_fail_closed "${previous_image:-${candidate_image}}" "${previous_commit:-${commit}}" || true
    fi
    docker container rm --force "${candidate}" >/dev/null 2>&1 || true
    return 0
  fi
  if [[ "${bootstrap_scheduler_started}" == true || "${archive_restore_needed}" == true ]]; then
    if ! quiesce_candidate_scheduler; then return 1; fi
  fi
  if ! restore_archive_backup; then
    echo "CRITICAL: failed to restore the pre-migration archive pointer." >&2
    return 1
  fi
  docker container rm --force "${candidate}" >/dev/null 2>&1 || true
  if [[ "${first_release}" == true && "${candidate_phase_complete}" != true ]]; then
    SOURCE_COMMIT="${commit}" DEUCE_WEB_IMAGE="${candidate_image}" "${compose[@]}" rm --force --stop web scheduler >/dev/null 2>&1 || true
  fi
  if ! resume_previous_scheduler; then return 1; fi
}
trap cleanup_candidate EXIT

for attempt in {1..60}; do
  if docker exec "${candidate}" node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"; then break; fi
  if [[ "${attempt}" == 60 ]]; then
    docker logs --tail=200 "${candidate}" >&2
    echo "Candidate did not become healthy." >&2
    exit 1
  fi
  sleep 5
done

if ! docker exec "${candidate}" node -e '
  const secret=process.env.METRICS_SECRET;
  if(!secret){console.error("METRICS_SECRET is required");process.exit(1)}
  fetch("http://127.0.0.1:3000/api/metrics",{headers:{Authorization:"Bearer "+secret},signal:AbortSignal.timeout(10000)})
    .then(async response=>{const body=await response.text();if(!response.ok||!body.includes("deuce_process_memory_bytes")||!body.includes("deuce_cache_entries"))process.exit(1)})
    .catch(()=>process.exit(1));'; then
  echo "Candidate metrics endpoint failed its authenticated probe." >&2
  exit 1
fi

# Stop the previously promoted scheduler before taking the migration snapshot.
# Any request already in flight must finish and release the shared archive lease
# before the candidate may back up or mutate the pointer.
if ! pause_previous_scheduler; then
  echo "Could not establish an idle archive for the candidate migration." >&2
  exit 1
fi

# Publish the bundled generation only when storage is empty or its manifest is
# incompatible with this image. The endpoint is idempotent and writes the
# manifest pointer last. Existing releases keep an atomic pointer backup until
# both gates pass, so a failed migration can restore the previous image safely.
seed_backup=""
if [[ "${first_release}" != true ]]; then
  archive_restore_needed=true
  seed_backup="${commit}"
fi
seed_complete=false
for attempt in {1..84}; do
  if docker exec "${candidate}" node -e '
  const secret=process.env.CRON_SECRET;
  if(!secret){console.error("CRON_SECRET is required for snapshot seed/migration");process.exit(1)}
  const backup=process.argv[1],headers={Authorization:"Bearer "+secret};if(backup)headers["X-DEUCE-Deploy-Backup"]=backup;
  fetch("http://127.0.0.1:3000/api/cron/seed",{headers,signal:AbortSignal.timeout(300000)})
    .then(async response=>{const body=await response.json().catch(()=>({status:"invalid-response"}));console.log(JSON.stringify({status:body.status,version:body.version,migratedFromVersion:body.migratedFromVersion,matches:body.matches,pieces:body.pieces,atpPieces:body.atpPieces,wtaPieces:body.wtaPieces}));if(response.status===503&&body.status==="busy")process.exit(75);if(!response.ok)process.exit(1)})
    .catch(error=>{console.error(error instanceof Error?error.message:"Snapshot seed/migration failed");process.exit(1)});' "${seed_backup}"; then
    seed_complete=true
    break
  else
    seed_exit="$?"
    if [[ "${seed_exit}" == 75 ]]; then sleep 5; else break; fi
  fi
done
if [[ "${seed_complete}" != true ]]; then
  docker logs --tail=200 "${candidate}" >&2
  echo "Snapshot seed/migration failed; release was not promoted." >&2
  exit 1
fi

# Heartbeat-only mode keeps the archive quiescent through both gates on every
# release. Normal catch-up resumes only after the candidate is fully promoted.
scheduler_started_ms="$(($(date +%s) * 1000))"
SOURCE_COMMIT="${commit}" DEUCE_WEB_IMAGE="${candidate_image}" DEUCE_SCHEDULER_HEARTBEAT_ONLY=1 \
  "${compose[@]}" up -d --no-build --no-deps --force-recreate scheduler
bootstrap_scheduler_started=true
if ! wait_for_fresh_scheduler "${scheduler_started_ms}"; then
  echo "Bootstrap scheduler did not publish a fresh healthy heartbeat." >&2
  exit 1
fi

verify_args=(
  --url=http://127.0.0.1:3000/api/health/deep
  --expected-commit="${commit}"
  --allow-initial-daily-unavailable
)
candidate_verify_args=("${verify_args[@]}" --allow-host-issue)

candidate_verified=false
for attempt in {1..36}; do
  if docker exec "${candidate}" node /app/ops/verify-release.mjs \
    "${candidate_verify_args[@]}"; then
    candidate_verified=true
    break
  fi
  sleep 5
done
if [[ "${candidate_verified}" != true ]]; then
  docker logs --tail=200 "${candidate}" >&2
  echo "Candidate failed the deep release gate; the active service was not changed." >&2
  exit 1
fi
candidate_phase_complete=true

rollback() {
  local failed_image="$1"
  rollback_recovery_owned=true
  rollback_recovery_succeeded=false
  echo "Release ${failed_image} failed after promotion; starting automatic rollback." >&2
  if ! quiesce_candidate_scheduler; then
    stop_scheduler_fail_closed "${failed_image}" "${commit}" || true
    echo "Automatic rollback stopped: candidate archive writes could not be quiesced." >&2
    return 1
  fi
  if ! restore_archive_backup; then
    echo "Automatic rollback stopped: the previous archive pointer could not be restored." >&2
    return 1
  fi
  if [[ -z "${previous_image}" ]] || ! docker image inspect "${previous_image}" >/dev/null 2>&1; then
    echo "No previous image is available. Removing the failed first-release containers for a clean retry." >&2
    SOURCE_COMMIT="${commit}" DEUCE_WEB_IMAGE="${failed_image}" "${compose[@]}" stop web scheduler caddy >/dev/null 2>&1 || true
    SOURCE_COMMIT="${commit}" DEUCE_WEB_IMAGE="${failed_image}" "${compose[@]}" rm --force --stop web scheduler caddy >/dev/null 2>&1 || true
    docker container rm --force "${candidate}" >/dev/null 2>&1 || true
    return 1
  fi
  local rollback_started_ms web_restored=false
  rollback_started_ms="$(($(date +%s) * 1000))"
  # Recover web and caddy with a heartbeat-only scheduler first. This proves
  # the previous stack without allowing provider or publication mutations.
  if ! SOURCE_COMMIT="${previous_commit}" DEUCE_WEB_IMAGE="${previous_image}" DEUCE_SCHEDULER_HEARTBEAT_ONLY=1 \
    "${compose[@]}" up -d --no-build --force-recreate web scheduler caddy; then
    stop_scheduler_fail_closed "${previous_image}" "${previous_commit}" || true
    echo "Automatic rollback could not recreate the previous stack." >&2
    return 1
  fi
  for attempt in {1..30}; do
    if SOURCE_COMMIT="${previous_commit}" DEUCE_WEB_IMAGE="${previous_image}" "${compose[@]}" exec -T web \
      node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"; then
      web_restored=true
      break
    fi
    sleep 5
  done
  if [[ "${web_restored}" != true ]] \
    || ! wait_for_caddy \
    || ! wait_for_fresh_scheduler "${rollback_started_ms}" "${previous_image}" "${previous_commit}"; then
    stop_scheduler_fail_closed "${previous_image}" "${previous_commit}" || true
    echo "Automatic rollback could not restore a healthy previous web and scheduler." >&2
    return 1
  fi
  if ! write_release_marker "${STATE_DIR}/active-commit" "${previous_commit}" \
    || ! write_release_marker "${STATE_DIR}/active-image" "${previous_image}" \
    || ! write_release_marker "${STATE_DIR}/failed-image" "${failed_image}" \
    || ! sync -f "${STATE_DIR}"; then
    stop_scheduler_fail_closed "${previous_image}" "${previous_commit}" || true
    echo "Automatic rollback restored the stack but could not restore its durable release markers." >&2
    return 1
  fi
  rollback_started_ms="$(($(date +%s) * 1000))"
  if ! SOURCE_COMMIT="${previous_commit}" DEUCE_WEB_IMAGE="${previous_image}" DEUCE_SCHEDULER_HEARTBEAT_ONLY=0 DEUCE_SCHEDULER_PIPELINE_DELAY_MS=600000 \
    "${compose[@]}" up -d --no-build --no-deps --force-recreate scheduler; then
    stop_scheduler_fail_closed "${previous_image}" "${previous_commit}" || true
    echo "Automatic rollback restored web but could not enable the previous scheduler." >&2
    return 1
  fi
  if ! wait_for_fresh_scheduler "${rollback_started_ms}" "${previous_image}" "${previous_commit}"; then
    stop_scheduler_fail_closed "${previous_image}" "${previous_commit}" || true
    echo "Automatic rollback left the scheduler stopped because its normal heartbeat failed." >&2
    return 1
  fi
  previous_scheduler_paused=false
  bootstrap_scheduler_started=false
  rollback_recovery_succeeded=true
  echo "Rollback restored ${previous_image} with a fresh scheduler heartbeat." >&2
  return 0
}

if [[ "${first_release}" == true ]]; then
  cleanup_candidate
  trap - EXIT
fi
if ! SOURCE_COMMIT="${commit}" DEUCE_WEB_IMAGE="${candidate_image}" "${compose[@]}" up -d --no-build --force-recreate web; then
  rollback "${candidate_image}"
  exit 1
fi
scheduler_started_ms="$(($(date +%s) * 1000))"
if ! SOURCE_COMMIT="${commit}" DEUCE_WEB_IMAGE="${candidate_image}" DEUCE_SCHEDULER_HEARTBEAT_ONLY=1 \
  "${compose[@]}" up -d --no-build --force-recreate scheduler caddy; then
  rollback "${candidate_image}"
  exit 1
fi
if ! wait_for_caddy; then
  echo "Caddy did not accept the production configuration." >&2
  rollback "${candidate_image}"
  exit 1
fi
if ! wait_for_fresh_scheduler "${scheduler_started_ms}"; then
  echo "Recreated scheduler did not publish a fresh healthy heartbeat." >&2
  rollback "${candidate_image}"
  exit 1
fi
if ! DEUCE_RESOURCE_CHECK_LOCK_HELD=1 "${ROOT}/ops/vps/resource-check.sh"; then
  echo "The promoted stack failed its host resource probe." >&2
  rollback "${candidate_image}"
  exit 1
fi

promoted=false
for attempt in {1..36}; do
  if SOURCE_COMMIT="${commit}" DEUCE_WEB_IMAGE="${candidate_image}" "${compose[@]}" exec -T web \
    node /app/ops/verify-release.mjs "${verify_args[@]}"; then
    promoted=true
    break
  fi
  sleep 5
done
if [[ "${promoted}" != true ]]; then
  rollback "${candidate_image}"
  exit 1
fi

# Only after both deep gates accept the seeded release do we enable catch-up and
# the normal ATP/WTA pipeline. Container health proves that its persisted
# heartbeat is valid without waiting for provider work to finish. Its startup
# guard exceeds the health wait, leaving enough time to commit the active marker
# and then discard the rollback snapshot before any archive mutation can begin.
scheduler_started_ms="$(($(date +%s) * 1000))"
if ! SOURCE_COMMIT="${commit}" DEUCE_WEB_IMAGE="${candidate_image}" DEUCE_SCHEDULER_HEARTBEAT_ONLY=0 DEUCE_SCHEDULER_PIPELINE_DELAY_MS=600000 \
  "${compose[@]}" up -d --no-build --no-deps --force-recreate scheduler; then
  rollback "${candidate_image}"
  exit 1
fi
if ! wait_for_fresh_scheduler "${scheduler_started_ms}"; then
  echo "Normal scheduler did not publish a fresh healthy heartbeat." >&2
  rollback "${candidate_image}"
  exit 1
fi
# Commit the authoritative marker while rollback is still possible. active-image
# is renamed last; a marker failure therefore restores the archive and previous
# stack. Cleanup of the now-obsolete backup is best effort after this boundary.
if ! commit_release_markers; then
  echo "Could not commit the promoted release markers." >&2
  rollback "${candidate_image}"
  exit 1
fi
bootstrap_scheduler_started=false
previous_scheduler_paused=false
if ! discard_archive_backup; then
  echo "Warning: promoted release is active, but its obsolete rollback snapshot could not be removed." >&2
fi
cleanup_candidate
trap - EXIT
cleanup_old_images
SOURCE_COMMIT="${commit}" DEUCE_WEB_IMAGE="${candidate_image}" "${compose[@]}" ps
echo "Promoted ${candidate_image}; deep health and scheduler heartbeat verified."
