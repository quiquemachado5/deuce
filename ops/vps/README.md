# DEUCE on a fixed-price VPS

Use a European VPS with at least 2 vCPU, 4 GB RAM, 40 GB persistent disk and a public IPv4 address.

1. Install Ubuntu or Debian and run `ops/vps/bootstrap.sh` as `root`.
2. Copy the deployment SSH public key to `/home/deuce/.ssh/authorized_keys`.
3. Clone the repository into `/opt/deuce/app` as the `deuce` user.
4. Create `/opt/deuce/app/.env.production` from `.env.production.example`. Use a DNS name that resolves to the server IP; an `sslip.io` hostname works without buying a domain.
5. Run `ops/vps/deploy.sh` as `deuce`.
6. Restore the latest archive backup into the `deuce_archive` Docker volume before enabling the scheduler when a newer filesystem snapshot exists.

Caddy provisions and renews HTTPS automatically. The compose stack keeps the web process, scheduler and reverse proxy running after restarts. A systemd watchdog checks the stack every two minutes and restores unhealthy services. The archive remains in the named Docker volume, with seven days of compressed local backups under `/opt/deuce/backups`.

The VPS 500 G12.5 monthly configuration provides the required 2 vCPU, 4 GB RAM, public IPv4 and 64 GB persistent SSD. Set `DEUCE_ARCHIVE_MAX_BYTES` below 40 GB so Docker images, builds and backups retain safe disk headroom.
