#!/usr/bin/env bash
set -euo pipefail

ROOT="${DEUCE_ROOT:-/opt/deuce/app}"
BACKUP_DIR="${DEUCE_BACKUP_DIR:-/opt/deuce/backups}"
KEEP_DAYS="${DEUCE_BACKUP_KEEP_DAYS:-7}"

cd "${ROOT}"
install -d -m 0750 "${BACKUP_DIR}"

if [[ ! -f .env.production ]]; then
  echo "DEUCE backup failed: ${ROOT}/.env.production is missing." >&2
  exit 1
fi
if [[ -z "${DEUCE_BACKUP_REMOTE:-}" ]]; then
  echo "DEUCE_BACKUP_REMOTE is required; local-only backups are not accepted." >&2
  exit 1
fi
if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone is required for the mandatory offsite backup." >&2
  exit 1
fi

web_id="$(docker compose --env-file .env.production ps -q web)"
if [[ -z "${web_id}" ]] || [[ "$(docker inspect --format '{{.State.Running}}' "${web_id}")" != "true" ]]; then
  echo "DEUCE backup skipped: web container is not running." >&2
  exit 1
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
temporary="${BACKUP_DIR}/.deuce-archive-${stamp}.tar.gz.tmp"
destination="${BACKUP_DIR}/deuce-archive-${stamp}.tar.gz"
validation="${BACKUP_DIR}/.deuce-archive-${stamp}.validation.tmp"
cleanup(){ rm -f -- "${temporary}" "${validation}"; }
trap cleanup EXIT

# A checksum only proves that transport preserved the tar. Validate the frozen
# tar itself before upload so a concurrent atomic publication can never leave an
# offsite backup whose manifest and artifact packs belong to different states.
image="$(docker inspect --format '{{.Config.Image}}' "${web_id}")"
restore_validated=false
for attempt in {1..3}; do
  if docker compose --env-file .env.production exec -T web \
      tar -czf - -C /app/.deuce-archive . >"${temporary}" \
    && docker run --rm --user 0:0 \
      --mount "type=bind,source=${temporary},target=/restore/backup.tar.gz,readonly" \
      --env DEUCE_RESTORE_ARCHIVE=/restore/backup.tar.gz "${image}" \
      node /app/build/restore-drill.mjs >"${validation}"; then
    restore_validated=true
    break
  fi
  echo "Snapshot changed or failed validation during backup attempt ${attempt}; retrying." >&2
  if (( attempt < 3 )); then sleep "$((attempt * 5))"; fi
done
if [[ "${restore_validated}" != true ]]; then
  echo "DEUCE backup failed: the frozen archive did not pass a full restore validation." >&2
  exit 1
fi
mv "${temporary}" "${destination}"
sha256sum "${destination}" >"${destination}.sha256"
sha256sum -c "${destination}.sha256"

remote="${DEUCE_BACKUP_REMOTE%/}"
rclone copyto "${destination}" "${remote}/$(basename "${destination}")" --checksum --immutable
rclone copyto "${destination}.sha256" "${remote}/$(basename "${destination}.sha256")" --checksum --immutable
local_hash="$(sha256sum "${destination}" | awk '{print $1}')"
remote_sidecar_hash="$(rclone cat "${remote}/$(basename "${destination}.sha256")" | awk 'NR==1 {print $1}')"
remote_archive_hash="$(rclone cat "${remote}/$(basename "${destination}")" | sha256sum | awk '{print $1}')"
if [[ -z "${remote_sidecar_hash}" || -z "${remote_archive_hash}" \
  || "${local_hash}" != "${remote_sidecar_hash}" || "${local_hash}" != "${remote_archive_hash}" ]]; then
  echo "Offsite checksum verification failed for $(basename "${destination}")." >&2
  exit 1
fi
completed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker compose --env-file .env.production exec -T web node -e '
  const {rename,writeFile}=require("node:fs/promises"),{join}=require("node:path");
  (async()=>{const root=process.env.DEUCE_ARCHIVE_DIR||"/app/.deuce-archive",target=join(root,"backup-status.json"),temporary=`${target}.${process.pid}.tmp`;
    await writeFile(temporary,JSON.stringify({status:"success",at:process.argv[1],archive:process.argv[2],sha256:process.argv[3],remote:process.argv[4],restoreValidated:true}));await rename(temporary,target)})().catch(error=>{console.error(error);process.exit(1)});' \
  "${completed_at}" "$(basename "${destination}")" "${local_hash}" "${remote}"
printf '{"verifiedAt":"%s","archive":"%s","sha256":"%s","remote":"%s","restoreValidated":true}\n' \
  "${completed_at}" "$(basename "${destination}")" "${local_hash}" "${remote}" >"${BACKUP_DIR}/last-success.json"
mv "${validation}" "${BACKUP_DIR}/last-backup-validation.json"
trap - EXIT
echo "Restored locally, copied offsite and verified backup plus checksum at ${remote}."

find "${BACKUP_DIR}" -type f -name 'deuce-archive-*.tar.gz' -mtime "+${KEEP_DAYS}" -delete
find "${BACKUP_DIR}" -type f -name 'deuce-archive-*.tar.gz.sha256' -mtime "+${KEEP_DAYS}" -delete

echo "Created ${destination}."
