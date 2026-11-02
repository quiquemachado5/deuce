#!/usr/bin/env bash
set -euo pipefail

ROOT="${DEUCE_ROOT:-/opt/deuce/app}"
BACKUP_DIR="${DEUCE_BACKUP_DIR:-/opt/deuce/backups}"
KEEP_DAYS="${DEUCE_BACKUP_KEEP_DAYS:-7}"

cd "${ROOT}"
install -d -m 0750 "${BACKUP_DIR}"

if [[ ! -f .env.production ]]; then
  echo "DEUCE backup skipped: ${ROOT}/.env.production is missing."
  exit 0
fi

web_id="$(docker compose --env-file .env.production ps -q web)"
if [[ -z "${web_id}" ]] || [[ "$(docker inspect --format '{{.State.Running}}' "${web_id}")" != "true" ]]; then
  echo "DEUCE backup skipped: web container is not running." >&2
  exit 1
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
temporary="${BACKUP_DIR}/.deuce-archive-${stamp}.tar.gz.tmp"
destination="${BACKUP_DIR}/deuce-archive-${stamp}.tar.gz"

docker compose --env-file .env.production exec -T web \
  tar -czf - -C /app/.deuce-archive . >"${temporary}"
mv "${temporary}" "${destination}"
sha256sum "${destination}" >"${destination}.sha256"
sha256sum -c "${destination}.sha256"

if [[ -n "${DEUCE_BACKUP_REMOTE:-}" ]]; then
  if ! command -v rclone >/dev/null 2>&1; then
    echo "DEUCE_BACKUP_REMOTE is configured but rclone is unavailable." >&2
    exit 1
  fi
  remote="${DEUCE_BACKUP_REMOTE%/}"
  rclone copyto "${destination}" "${remote}/$(basename "${destination}")" --checksum
  rclone copyto "${destination}.sha256" "${remote}/$(basename "${destination}.sha256")" --checksum
  echo "Copied backup and checksum to ${remote}."
fi

find "${BACKUP_DIR}" -type f -name 'deuce-archive-*.tar.gz' -mtime "+${KEEP_DAYS}" -delete
find "${BACKUP_DIR}" -type f -name 'deuce-archive-*.tar.gz.sha256' -mtime "+${KEEP_DAYS}" -delete

echo "Created ${destination}."
