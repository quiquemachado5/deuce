#!/usr/bin/env bash
set -euo pipefail

readonly config="${RCLONE_CONFIG:-/home/deuce/.config/rclone/rclone.conf}"
readonly account="${R2_ACCOUNT_ID:-}"
readonly access_key="${R2_ACCESS_KEY_ID:-}"
readonly secret_key="${R2_SECRET_ACCESS_KEY:-}"
readonly bucket="${R2_BUCKET:-}"
readonly remote_name="${R2_REMOTE_NAME:-deuce-r2}"

if [[ -z "${account}" || -z "${access_key}" || -z "${secret_key}" || -z "${bucket}" ]]; then
  echo "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET are required." >&2
  exit 1
fi
if [[ ! "${account}" =~ ^[a-f0-9]{32}$ || ! "${remote_name}" =~ ^[a-z0-9-]+$ || ! "${bucket}" =~ ^[a-z0-9-]{3,63}$ ]]; then
  echo "The R2 account, remote or bucket name is invalid." >&2
  exit 1
fi
command -v rclone >/dev/null

umask 077
install -d -m 0700 "$(dirname "${config}")"
rclone --config "${config}" config create "${remote_name}" s3 \
  provider Cloudflare access_key_id "${access_key}" secret_access_key "${secret_key}" \
  endpoint "https://${account}.r2.cloudflarestorage.com" acl private no_check_bucket true \
  --non-interactive >/dev/null

readonly destination="${remote_name}:${bucket}/production"
readonly probe=".deuce-backup-probe-$(date -u +%Y%m%dT%H%M%SZ)"
printf 'DEUCE offsite backup probe\n' | rclone --config "${config}" rcat "${destination}/${probe}"
rclone --config "${config}" cat "${destination}/${probe}" | grep -qx 'DEUCE offsite backup probe'
rclone --config "${config}" deletefile "${destination}/${probe}"
chmod 0600 "${config}"

echo "Cloudflare R2 remote verified. Set DEUCE_BACKUP_REMOTE=${destination} in .env.production."
echo "Keep the bucket-scoped R2 credentials outside the server as part of the recovery record."
