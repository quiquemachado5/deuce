#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this bootstrap as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl docker.io docker-compose-v2 git ufw unattended-upgrades

if [[ ! -f /etc/docker/daemon.json ]]; then
  cat >/etc/docker/daemon.json <<'JSON'
{
  "live-restore": true,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
JSON
fi

systemctl enable --now docker

if ! id deuce >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash deuce
fi
usermod -aG docker deuce

if [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

install -d -o deuce -g deuce /opt/deuce /opt/deuce/backups

cat >/etc/systemd/system/deuce-watchdog.service <<'UNIT'
[Unit]
Description=DEUCE container health watchdog
ConditionPathExists=/opt/deuce/app/ops/vps/watchdog.sh
After=docker.service

[Service]
Type=oneshot
ExecStart=/opt/deuce/app/ops/vps/watchdog.sh
UNIT

cat >/etc/systemd/system/deuce-watchdog.timer <<'UNIT'
[Unit]
Description=Run the DEUCE health watchdog every two minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=2min
RandomizedDelaySec=15s
Persistent=true

[Install]
WantedBy=timers.target
UNIT

cat >/etc/systemd/system/deuce-backup.service <<'UNIT'
[Unit]
Description=Create a local DEUCE archive backup
ConditionPathExists=/opt/deuce/app/ops/vps/backup.sh
After=docker.service

[Service]
Type=oneshot
ExecStart=/opt/deuce/app/ops/vps/backup.sh
UNIT

cat >/etc/systemd/system/deuce-backup.timer <<'UNIT'
[Unit]
Description=Back up the DEUCE archive daily

[Timer]
OnCalendar=*-*-* 03:15:00 UTC
RandomizedDelaySec=10min
Persistent=true

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now deuce-watchdog.timer deuce-backup.timer
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "DEUCE VPS bootstrap complete. Docker, firewall, swap, watchdog, backups and security updates are active."
