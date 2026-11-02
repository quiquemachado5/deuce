#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this bootstrap as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl docker.io docker-compose-v2 git ufw unattended-upgrades
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

install -d -o deuce -g deuce /opt/deuce
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "DEUCE VPS bootstrap complete. Docker, firewall, swap and security updates are active."
