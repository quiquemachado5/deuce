#!/usr/bin/env bash
set -euo pipefail

ROOT="${DEUCE_ROOT:-/opt/deuce/app}"
cd "${ROOT}"

if [[ ! -f .env.production ]]; then
  echo "DEUCE watchdog skipped: ${ROOT}/.env.production is missing."
  exit 0
fi

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

for service in scheduler caddy; do
  service_id="$("${compose[@]}" ps -q "${service}")"
  if [[ -z "${service_id}" ]] || [[ "$(docker inspect --format '{{.State.Running}}' "${service_id}")" != "true" ]]; then
    echo "DEUCE ${service} container is absent or stopped; restoring it."
    "${compose[@]}" up -d --no-build "${service}"
  fi
done
