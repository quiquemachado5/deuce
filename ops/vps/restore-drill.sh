#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${DEUCE_ROOT:-/opt/deuce/app}"
BACKUP_DIR="${DEUCE_BACKUP_DIR:-/opt/deuce/backups}"
STATE_DIR="${DEUCE_DEPLOY_STATE_DIR:-/opt/deuce/deployments}"

cd "${ROOT}"
if [[ ! -f .env.production ]]; then
  echo "Restore drill failed: ${ROOT}/.env.production is missing." >&2
  exit 1
fi
if [[ -z "${DEUCE_BACKUP_REMOTE:-}" ]]; then
  echo "DEUCE_BACKUP_REMOTE is required for the restore drill." >&2
  exit 1
fi
if [[ ! -s "${STATE_DIR}/active-image" ]]; then
  echo "No active immutable image is recorded." >&2
  exit 1
fi

remote="${DEUCE_BACKUP_REMOTE%/}"
latest="$(rclone lsf "${remote}" --files-only --include 'deuce-archive-*.tar.gz' | sort | tail -n 1)"
if [[ -z "${latest}" || ! "${latest}" =~ ^deuce-archive-[0-9]{8}T[0-9]{6}Z\.tar\.gz$ ]]; then
  echo "No valid offsite archive was found at ${remote}." >&2
  exit 1
fi
maximum_age_hours="${DEUCE_RESTORE_MAX_AGE_HOURS:-192}"
if [[ ! "${maximum_age_hours}" =~ ^[0-9]+$ ]] || (( maximum_age_hours < 1 )); then
  echo "DEUCE_RESTORE_MAX_AGE_HOURS must be a positive integer." >&2
  exit 1
fi
stamp="${latest#deuce-archive-}"; stamp="${stamp%.tar.gz}"
backup_at="${stamp:0:4}-${stamp:4:2}-${stamp:6:2}T${stamp:9:2}:${stamp:11:2}:${stamp:13:2}Z"
backup_epoch="$(date -u -d "${backup_at}" +%s)"
now_epoch="$(date -u +%s)"
age_seconds="$((now_epoch - backup_epoch))"
if (( age_seconds < 0 || age_seconds > maximum_age_hours * 3600 )); then
  echo "Latest offsite backup is outside the ${maximum_age_hours} hour restore window: ${latest}." >&2
  exit 1
fi

temporary="$(mktemp -d "${BACKUP_DIR}/.restore-drill.XXXXXX")"
cleanup(){ rm -rf -- "${temporary}"; }
trap cleanup EXIT
rclone copyto "${remote}/${latest}" "${temporary}/${latest}" --checksum
rclone copyto "${remote}/${latest}.sha256" "${temporary}/${latest}.sha256" --checksum
expected="$(awk 'NR==1 {print $1}' "${temporary}/${latest}.sha256")"
actual="$(sha256sum "${temporary}/${latest}" | awk '{print $1}')"
if [[ -z "${expected}" || "${actual}" != "${expected}" ]]; then
  echo "Downloaded offsite backup failed checksum validation." >&2
  exit 1
fi

image="$(<"${STATE_DIR}/active-image")"
docker image inspect "${image}" >/dev/null
docker run --rm --user 0:0 --volume "${temporary}:/restore:ro" \
  --env "DEUCE_RESTORE_ARCHIVE=/restore/${latest}" "${image}" \
  node /app/build/restore-drill.mjs | tee "${BACKUP_DIR}/last-restore-drill.log"
verified_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
age_hours="$((age_seconds / 3600))"
docker compose --env-file .env.production exec -T web node -e '
  const {rename,writeFile}=require("node:fs/promises"),{join}=require("node:path");
  (async()=>{const root=process.env.DEUCE_ARCHIVE_DIR||"/app/.deuce-archive",target=join(root,"restore-drill-status.json"),temporary=`${target}.${process.pid}.tmp`;
    await writeFile(temporary,JSON.stringify({status:"success",at:process.argv[1],backupAt:process.argv[2],backupAgeHours:Number(process.argv[3]),archive:process.argv[4],sha256:process.argv[5],image:process.argv[6],restoreValidated:true}));await rename(temporary,target)})().catch(error=>{console.error(error);process.exit(1)});' \
  "${verified_at}" "${backup_at}" "${age_hours}" "${latest}" "${actual}" "${image}"
printf '{"verifiedAt":"%s","archive":"%s","sha256":"%s","image":"%s","restoreValidated":true}\n' \
  "${verified_at}" "${latest}" "${actual}" "${image}" >"${BACKUP_DIR}/last-restore-drill.json"
