#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this SSH hardening step as root." >&2
  exit 1
fi

authorized_keys=/home/deuce/.ssh/authorized_keys
if [[ ! -s "${authorized_keys}" ]]; then
  echo "Refusing to disable password access before ${authorized_keys} contains a deployment key." >&2
  exit 1
fi

install -d -m 0755 /etc/ssh/sshd_config.d
cat >/etc/ssh/sshd_config.d/99-deuce.conf <<'CONF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AllowUsers deuce
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
PermitTunnel no
ClientAliveInterval 300
ClientAliveCountMax 2
CONF

sshd -t
systemctl reload ssh
echo "SSH hardened. Verify a new deuce key-only session before closing the current console."
