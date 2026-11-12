import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../ops/vps/backup.sh', import.meta.url), 'utf8')
const restore = await readFile(new URL('../ops/vps/restore-drill.sh', import.meta.url), 'utf8')
const bootstrap = await readFile(new URL('../ops/vps/bootstrap.sh', import.meta.url), 'utf8')
const hardenSsh = await readFile(new URL('../ops/vps/harden-ssh.sh', import.meta.url), 'utf8')
const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8')
const restoreValidation = await readFile(new URL('../build/restore-validation.mjs', import.meta.url), 'utf8')

test('restore image includes its publication hash dependency', () => {
  assert.match(restoreValidation, /from '\.\.\/lib\/publication-hash\.mjs'/)
  assert.match(dockerfile, /COPY[^\n]*\/app\/lib\/publication-hash\.mjs \.\/lib\/publication-hash\.mjs/)
})

test('offsite backup validates a frozen restore before checksum and upload', () => {
  const restore = source.indexOf('node /app/build/restore-drill.mjs')
  const checksum = source.indexOf('sha256sum "${destination}"')
  const upload = source.indexOf('rclone copyto "${destination}"')
  assert.ok(restore >= 0 && restore < checksum && checksum < upload)
  assert.match(source, /last-backup-validation\.json/)
  assert.match(source, /for attempt in \{1\.\.3\}/)
  assert.match(source, /rclone cat "\$\{remote\}\/\$\(basename "\$\{destination\}"\)" \| sha256sum/)
  assert.match(source, /backup-status\.json/)
  assert.match(source, /rclone delete "\$\{remote\}" --min-age "\$\{REMOTE_KEEP_DAYS\}d" --include 'deuce-archive-\*'/)
  assert.ok(source.indexOf('remote_archive_hash=') < source.indexOf('rclone delete "${remote}"'))
})

test('backup metadata generation does not require Node on the host', () => {
  assert.doesNotMatch(source, /(?:^|\n)node -e /)
  assert.match(source, /run_host_node\(\)/)
  assert.match(source, /node:24-bookworm-slim node "\$@"/)
  assert.match(source, /--network none/)
})

test('restore drill rejects stale backups and services use the deuce rclone account', () => {
  assert.match(restore, /DEUCE_RESTORE_MAX_AGE_HOURS:-192/)
  assert.match(restore, /restore-drill-status\.json/)
  assert.match(restore, /restoreValidated:true/)
  assert.ok((bootstrap.match(/User=deuce/g) || []).length >= 3)
  assert.ok((bootstrap.match(/RCLONE_CONFIG=\/home\/deuce\/\.config\/rclone\/rclone\.conf/g) || []).length >= 2)
})

test('host bootstrap rate-limits SSH and hardening cannot lock out a keyless server', () => {
  assert.match(bootstrap, /fail2ban/)
  assert.match(bootstrap, /timedatectl set-ntp true/)
  assert.ok(hardenSsh.indexOf('authorized_keys') < hardenSsh.indexOf('PasswordAuthentication no'))
  assert.match(hardenSsh, /sshd -t/)
  assert.match(hardenSsh, /PermitRootLogin no/)
  assert.match(hardenSsh, /AllowAgentForwarding no/)
  assert.match(hardenSsh, /AllowTcpForwarding no/)
  assert.match(hardenSsh, /ClientAliveInterval 300/)
  assert.doesNotMatch(bootstrap, /NOPASSWD\s*:\s*ALL/)
})
