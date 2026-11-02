#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this bootstrap as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl docker.io docker-compose-v2 git rclone ufw unattended-upgrades

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

install -d -o deuce -g deuce /opt/deuce /opt/deuce/backups /opt/deuce/deployments /opt/deuce/logs
if [[ ! -e /opt/deuce/deployments/deploy.lock ]]; then
  install -m 0660 -o deuce -g deuce /dev/null /opt/deuce/deployments/deploy.lock
else
  chown deuce:deuce /opt/deuce/deployments/deploy.lock
  chmod 0660 /opt/deuce/deployments/deploy.lock
fi

cat >/etc/systemd/system/deuce-watchdog.service <<'UNIT'
[Unit]
Description=DEUCE container health watchdog
ConditionPathExists=/opt/deuce/app/ops/vps/watchdog.sh
After=docker.service

[Service]
Type=oneshot
User=deuce
Group=deuce
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
Description=Create and verify the mandatory offsite DEUCE archive backup
ConditionPathExists=/opt/deuce/app/ops/vps/backup.sh
After=docker.service

[Service]
Type=oneshot
User=deuce
Group=deuce
Environment=RCLONE_CONFIG=/home/deuce/.config/rclone/rclone.conf
EnvironmentFile=/opt/deuce/app/.env.production
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

cat >/etc/systemd/system/deuce-restore-drill.service <<'UNIT'
[Unit]
Description=Download and verify restoration of the latest DEUCE offsite backup
ConditionPathExists=/opt/deuce/app/ops/vps/restore-drill.sh
After=docker.service deuce-backup.service

[Service]
Type=oneshot
User=deuce
Group=deuce
Environment=RCLONE_CONFIG=/home/deuce/.config/rclone/rclone.conf
EnvironmentFile=/opt/deuce/app/.env.production
ExecStart=/opt/deuce/app/ops/vps/restore-drill.sh
UNIT

cat >/etc/systemd/system/deuce-restore-drill.timer <<'UNIT'
[Unit]
Description=Run a real DEUCE offsite restore drill every week

[Timer]
OnCalendar=Sun *-*-* 04:35:00 UTC
RandomizedDelaySec=20min
Persistent=true

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now deuce-watchdog.timer deuce-backup.timer deuce-restore-drill.timer
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "DEUCE VPS bootstrap complete. Docker, firewall, swap, watchdog, offsite backups, restore drills and security updates are active."
