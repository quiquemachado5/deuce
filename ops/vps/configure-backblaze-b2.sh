#!/usr/bin/env bash
set -euo pipefail

readonly config="${RCLONE_CONFIG:-/home/deuce/.config/rclone/rclone.conf}"
readonly account="${B2_ACCOUNT_ID:-}"
readonly key="${B2_APPLICATION_KEY:-}"
readonly bucket="${B2_BUCKET:-}"
readonly remote_name="${B2_REMOTE_NAME:-deuce-b2}"

if [[ -z "${account}" || -z "${key}" || -z "${bucket}" ]]; then
  echo "B2_ACCOUNT_ID, B2_APPLICATION_KEY and B2_BUCKET are required." >&2
  exit 1
fi
if [[ ! "${remote_name}" =~ ^[a-z0-9-]+$ || ! "${bucket}" =~ ^[A-Za-z0-9-]{6,50}$ ]]; then
  echo "The remote or bucket name is invalid." >&2
  exit 1
fi
command -v rclone >/dev/null

umask 077
install -d -m 0700 "$(dirname "${config}")"
rclone --config "${config}" config create "${remote_name}" b2 \
  account "${account}" key "${key}" hard_delete true --non-interactive >/dev/null

readonly destination="${remote_name}:${bucket}/production"
readonly probe=".deuce-backup-probe-$(date -u +%Y%m%dT%H%M%SZ)"
printf 'DEUCE offsite backup probe\n' | rclone --config "${config}" rcat "${destination}/${probe}"
rclone --config "${config}" cat "${destination}/${probe}" | grep -qx 'DEUCE offsite backup probe'
rclone --config "${config}" deletefile "${destination}/${probe}"
chmod 0600 "${config}"

echo "Backblaze B2 remote verified. Set DEUCE_BACKUP_REMOTE=${destination} in .env.production."
echo "Keep the bucket-scoped B2 key outside the server as part of the recovery record."
