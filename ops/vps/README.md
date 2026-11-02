# DEUCE on a fixed-price VPS

Use a European VPS with at least 2 vCPU, 4 GB RAM, 40 GB persistent disk and a public IPv4 address.

1. Install Ubuntu or Debian and run `ops/vps/bootstrap.sh` as `root`.
2. Copy the deployment SSH public key to `/home/deuce/.ssh/authorized_keys`.
3. Clone the repository into `/opt/deuce/app` as the `deuce` user.
4. Create `/opt/deuce/app/.env.production` from `.env.production.example`. Use a DNS name that resolves to the server IP; an `sslip.io` hostname works without buying a domain.
5. Run `ops/vps/deploy.sh` as `deuce`.
6. If a newer filesystem backup exists, validate it first with `DEUCE_RESTORE_ARCHIVE=/path/to/backup.tar.gz npm run data:restore-drill`, then restore it into the `deuce_archive` Docker volume before enabling the scheduler.

Caddy provisions and renews HTTPS automatically. The compose stack keeps the web process, scheduler and reverse proxy running after restarts. A systemd watchdog checks the stack every two minutes and recreates unhealthy services. The scheduler writes a heartbeat plus independent ATP, WTA and publication stages to the shared archive volume; publication waits for both circuits and transient failures retry with exponential delays.

The archive remains in the named Docker volume, with seven days of compressed local backups under `/opt/deuce/backups`. Configure an `rclone` remote and set `DEUCE_BACKUP_REMOTE` in `.env.production` to copy every backup and checksum off the server. Periodically download one of those remote files and run the restore drill above.

The build gate requires the ATP and WTA minimums, dataset and rules versions, source commit, storage headroom and a fresh scheduler heartbeat. An optional immutable reading snapshot can be exported with `npm run data:snapshot:export`; publish its directory over HTTPS and set `DEUCE_SNAPSHOT_MANIFEST_URL` plus `DEUCE_EXPECTED_SNAPSHOT_COMMIT`. Docker restores it only inside the build stage, verifies every SHA-256 and falls back to rebuilding from the compact versioned archives.

The VPS 500 G12.5 monthly configuration provides the required 2 vCPU, 4 GB RAM, public IPv4 and 64 GB persistent SSD. Set `DEUCE_ARCHIVE_MAX_BYTES` below 40 GB so Docker images, builds and backups retain safe disk headroom.
