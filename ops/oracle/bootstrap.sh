#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this bootstrap as root." >&2
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2 git ufw
systemctl enable --now docker
usermod -aG docker ubuntu

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

install -d -o ubuntu -g ubuntu /opt/deuce
echo "Bootstrap complete. Reconnect so the ubuntu user receives the docker group."
