#!/usr/bin/env bash
set -euo pipefail

ROOT="${DEUCE_ROOT:-/opt/deuce/app}"
STATE_DIR="${DEUCE_DEPLOY_STATE_DIR:-/opt/deuce/deployments}"
LOCK_FILE="${DEUCE_DEPLOY_LOCK_FILE:-${STATE_DIR}/deploy.lock}"
cd "${ROOT}"
[[ -e "${LOCK_FILE}" && -f .env.production && -s "${STATE_DIR}/active-image" ]] || exit 0
if [[ "${DEUCE_RESOURCE_CHECK_LOCK_HELD:-0}" != 1 ]]; then
  exec 9<"${LOCK_FILE}"
  flock -n -s 9 || exit 0
fi

export DEUCE_WEB_IMAGE="$(<"${STATE_DIR}/active-image")"
export SOURCE_COMMIT="$(docker image inspect --format '{{index .Config.Labels \"org.opencontainers.image.revision\"}}' "${DEUCE_WEB_IMAGE}")"
compose=(docker compose --env-file .env.production)
service_state() {
  local id status health
  id="$("${compose[@]}" ps -q "$1")"
  [[ -n "${id}" ]] || { printf absent; return; }
  status="$(docker inspect --format '{{.State.Status}}' "${id}")"
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${id}")"
  [[ "${status}" == running ]] || { printf '%s' "${status}"; return; }
  printf '%s' "${health}"
}

web_id="$("${compose[@]}" ps -q web)"
[[ -n "${web_id}" ]] || exit 0
web_state="$(service_state web)"
scheduler_state="$(service_state scheduler)"
proxy_state="$(service_state caddy)"
disk_used="$(df -P "${ROOT}" | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
available_memory="$(( $(awk '/MemAvailable:/ {print $2}' /proc/meminfo) * 1024 ))"
web_limit="$(docker inspect --format '{{.HostConfig.Memory}}' "${web_id}")"
web_pid="$(docker inspect --format '{{.State.Pid}}' "${web_id}")"
cgroup_path="$(awk -F: '$1=="0" {print $3}' "/proc/${web_pid}/cgroup")"
web_memory=0
if [[ -n "${cgroup_path}" && -r "/sys/fs/cgroup${cgroup_path}/memory.current" ]]; then
  web_memory="$(<"/sys/fs/cgroup${cgroup_path}/memory.current")"
fi

status=healthy
if (( disk_used >= 85 || available_memory < 402653184 || web_memory <= 0 || web_limit <= 0 || web_memory * 100 >= web_limit * 90 )); then status=degraded; fi
if [[ "${web_state}" != healthy || "${scheduler_state}" != healthy || "${proxy_state}" != healthy ]]; then status=degraded; fi
payload="$(printf '{"status":"%s","at":"%s","diskUsedPercent":%s,"availableMemoryBytes":%s,"webMemoryBytes":%s,"webMemoryLimitBytes":%s,"web":"%s","scheduler":"%s","proxy":"%s"}' \
  "${status}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${disk_used}" "${available_memory}" "${web_memory}" "${web_limit}" "${web_state}" "${scheduler_state}" "${proxy_state}")"
printf '%s' "${payload}" | docker exec -i "${web_id}" node -e '
  const {readFile,rename,writeFile}=require("node:fs/promises"),{join}=require("node:path");
  (async()=>{let input="";for await(const chunk of process.stdin)input+=chunk;JSON.parse(input);
    const root=process.env.DEUCE_ARCHIVE_DIR||"/app/.deuce-archive",target=join(root,"host-status.json"),temporary=join(root,`.host-status.${process.pid}.tmp`);
    await writeFile(temporary,input,{mode:0o600});await rename(temporary,target);await readFile(target,"utf8");})().catch(error=>{console.error(error);process.exit(1)});'
