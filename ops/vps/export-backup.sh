#!/usr/bin/env bash
set -euo pipefail
readonly directory=/opt/deuce/backups
readonly original="${SSH_ORIGINAL_COMMAND:-metadata}"
if [[ "$original" == metadata ]]; then
  cat "$directory/last-encrypted.json"
elif [[ "$original" =~ ^download:(deuce-archive-[0-9]{8}T[0-9]{6}Z\.tar\.gz\.enc)$ ]]; then
  cat "$directory/${BASH_REMATCH[1]}"
elif [[ "$original" =~ ^ack:(deuce-archive-[0-9]{8}T[0-9]{6}Z\.tar\.gz\.enc):([a-f0-9]{64})$ ]]; then
  readonly archive="${BASH_REMATCH[1]}" hash="${BASH_REMATCH[2]}"
  [[ "$(sha256sum "$directory/$archive" | cut -d' ' -f1)" == "$hash" ]]
  # No shell supplied by the reader can execute; only a receipt matching the
  # locally validated encrypted artifact can update the external-copy evidence.
  docker exec -i deuce-web-1 node - "$archive" "$hash" <<'NODE'
const fs=require('fs');const root=process.env.DEUCE_ARCHIVE_DIR||'/app/.deuce-archive';const [archive,hash]=process.argv.slice(2);
const local=JSON.parse(fs.readFileSync(root+'/backup-local-status.json','utf8'));
if(local.encryptedArchive!==archive||local.encryptedSha256!==hash||!local.restoreValidated)throw Error('Receipt does not match validated backup');
const at=new Date().toISOString(),value={...local,status:'success',at,offsiteVerified:true,remote:'github-release:quiquemachado5/deuce',release:'archive-backup-'+archive.slice(14,30)};
fs.writeFileSync(root+'/backup-status.json.tmp',JSON.stringify(value),{mode:0o600});fs.renameSync(root+'/backup-status.json.tmp',root+'/backup-status.json');console.log(JSON.stringify({status:'verified',archive,at}));
NODE
  cp "$directory/last-encrypted.json" "$directory/last-offsite.json"
  printf '{"verifiedAt":"%s","archive":"%s","sha256":"%s","restoreValidated":true,"offsiteVerified":true}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$archive" "$hash" > "$directory/last-success.json"
else
  echo 'Only encrypted backup metadata, download and acknowledgement are allowed.' >&2
  exit 64
fi
