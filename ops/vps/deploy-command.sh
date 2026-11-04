#!/usr/bin/env bash
set -euo pipefail

readonly ROOT=/opt/deuce/app
readonly LOCK=/opt/deuce/deploy.lock
readonly original="${SSH_ORIGINAL_COMMAND:-}"

if [[ ! "${original}" =~ ^(deploy|probe):([a-f0-9]{40})$ ]]; then
  echo "Only an immutable DEUCE deployment or probe is allowed." >&2
  exit 64
fi

readonly action="${BASH_REMATCH[1]}"
readonly expected="${BASH_REMATCH[2]}"

cd "${ROOT}"
git fetch --quiet origin main
readonly actual="$(git rev-parse origin/main)"
if [[ "${actual}" != "${expected}" ]]; then
  echo "origin/main does not match the requested immutable commit." >&2
  exit 65
fi

if [[ "${action}" == probe ]]; then
  echo "DEUCE deploy guard ready for ${expected}."
  exit 0
fi

exec flock --exclusive --nonblock "${LOCK}" \
  env DEUCE_EXPECTED_COMMIT="${expected}" "${ROOT}/ops/vps/deploy.sh"
