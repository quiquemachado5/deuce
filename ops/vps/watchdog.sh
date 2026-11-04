#!/usr/bin/env bash
set -euo pipefail

ROOT="${DEUCE_ROOT:-/opt/deuce/app}"
STATE_DIR="${DEUCE_DEPLOY_STATE_DIR:-/opt/deuce/deployments}"
LOCK_FILE="${DEUCE_DEPLOY_LOCK_FILE:-${STATE_DIR}/deploy.lock}"
cd "${ROOT}"

if [[ ! -e "${LOCK_FILE}" ]]; then
  echo "DEUCE watchdog skipped: deployment lock is not initialized."
  exit 0
fi
exec 9<"${LOCK_FILE}"
if ! flock -n -s 9; then
  echo "DEUCE watchdog skipped: a deployment is active."
  exit 0
fi
if [[ ! -s "${STATE_DIR}/active-image" ]]; then
  echo "DEUCE watchdog skipped: no release has been promoted yet."
  exit 0
fi

if [[ ! -f .env.production ]]; then
  echo "DEUCE watchdog skipped: ${ROOT}/.env.production is missing."
  exit 0
fi

export DEUCE_WEB_IMAGE="$(<"${STATE_DIR}/active-image")"
export SOURCE_COMMIT="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "${DEUCE_WEB_IMAGE}")"

compose=(docker compose --env-file .env.production)
web_id="$("${compose[@]}" ps -q web)"

if [[ -z "${web_id}" ]]; then
  echo "DEUCE web container is absent; restoring the stack."
  "${compose[@]}" up -d --no-build --remove-orphans
  exit 0
fi

running="$(docker inspect --format '{{.State.Running}}' "${web_id}")"
health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${web_id}")"

if [[ "${running}" != "true" || "${health}" == "unhealthy" ]]; then
  echo "DEUCE web container is ${health}; restarting it."
  "${compose[@]}" restart web
fi

for service in scheduler caddy prometheus; do
  service_id="$("${compose[@]}" ps -q "${service}")"
  service_running="false"
  service_health="none"
  if [[ -n "${service_id}" ]]; then
    service_running="$(docker inspect --format '{{.State.Running}}' "${service_id}")"
    service_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${service_id}")"
  fi
  if [[ "${service_running}" != "true" || "${service_health}" == "unhealthy" ]]; then
    echo "DEUCE ${service} container is absent or stopped; restoring it."
    "${compose[@]}" up -d --no-build --force-recreate "${service}"
  fi
done
