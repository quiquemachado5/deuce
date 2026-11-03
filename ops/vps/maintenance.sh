#!/usr/bin/env bash
set -euo pipefail

STATE_DIR="${DEUCE_DEPLOY_STATE_DIR:-/opt/deuce/deployments}"
LOCK_FILE="${DEUCE_DEPLOY_LOCK_FILE:-${STATE_DIR}/deploy.lock}"
[[ -e "${LOCK_FILE}" ]] || exit 0
exec 9<>"${LOCK_FILE}"
flock -n 9 || exit 0

# Never prune volumes: the archive and runtime cache are durable production data.
docker builder prune --force --filter 'until=24h'
docker image prune --force --filter 'until=168h'
