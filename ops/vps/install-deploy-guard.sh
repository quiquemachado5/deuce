#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run the deploy guard installer through sudo once." >&2
  exit 1
fi

readonly encoded_key="${1:-}"
readonly deploy_user="${DEUCE_DEPLOY_USER:-${SUDO_USER:-deuce}}"
if [[ -z "${encoded_key}" || "${deploy_user}" == root ]]; then
  echo "A public deployment key and a non-root deployment user are required." >&2
  exit 1
fi

public_key="$(printf '%s' "${encoded_key}" | base64 --decode)"
read -r key_type key_body _ <<<"${public_key}"
if [[ ! "${key_type}" =~ ^(ssh-ed25519|ecdsa-sha2-nistp256|ssh-rsa)$ || -z "${key_body:-}" ]]; then
  echo "The supplied deployment public key is invalid." >&2
  exit 1
fi

readonly user_home="$(getent passwd "${deploy_user}" | cut -d: -f6)"
readonly ssh_dir="${user_home}/.ssh"
readonly authorized_keys="${ssh_dir}/authorized_keys"
readonly temporary="$(mktemp)"
trap 'rm -f "${temporary}"' EXIT

if [[ ! -f "${authorized_keys}" ]]; then
  echo "${authorized_keys} does not exist." >&2
  exit 1
fi

matches=0
while IFS= read -r line || [[ -n "${line}" ]]; do
  if [[ " ${line} " == *" ${key_type} ${key_body} "* ]]; then
    printf 'restrict,command="/usr/local/sbin/deuce-deploy-command" %s %s github-actions-deuce\n' "${key_type}" "${key_body}" >>"${temporary}"
    matches=$((matches + 1))
  else
    printf '%s\n' "${line}" >>"${temporary}"
  fi
done <"${authorized_keys}"

if [[ "${matches}" -ne 1 ]]; then
  echo "Expected exactly one matching deployment key, found ${matches}." >&2
  exit 1
fi

install -o root -g root -m 0755 "$(dirname "$0")/deploy-command.sh" /usr/local/sbin/deuce-deploy-command
install -d -o "${deploy_user}" -g "${deploy_user}" -m 0700 "${ssh_dir}"
install -o "${deploy_user}" -g "${deploy_user}" -m 0600 "${temporary}" "${authorized_keys}"
sshd -t

# The deployment key is now command-restricted. The deployment account keeps
# Docker access for the release pipeline but no longer has unrestricted sudo.
rm -f /etc/sudoers.d/deuce
echo "Restricted the GitHub deployment key and removed unrestricted sudo."
