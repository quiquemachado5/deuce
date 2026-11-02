# DEUCE on a fixed-price VPS

Use a European VPS with at least 2 vCPU, 4 GB RAM, 40 GB persistent disk and a public IPv4 address.

1. Install Ubuntu or Debian and run `ops/vps/bootstrap.sh` as `root`.
2. Copy the deployment SSH public key to `/home/deuce/.ssh/authorized_keys`.
3. Clone the repository into `/opt/deuce/app` as the `deuce` user.
4. Create `/opt/deuce/app/.env.production` from `.env.production.example`. Use a DNS name that resolves to the server IP; an `sslip.io` hostname works without buying a domain.
5. Run `ops/vps/deploy.sh` as `deuce`.
6. Restore the latest archive backup into the `deuce_archive` Docker volume before enabling the scheduler when a newer filesystem snapshot exists.

Caddy provisions and renews HTTPS automatically. The compose stack keeps the web process, scheduler and reverse proxy running after restarts. The archive remains in the named Docker volume.
