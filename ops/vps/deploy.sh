#!/usr/bin/env bash
set -euo pipefail

ROOT="${DEUCE_ROOT:-/opt/deuce/app}"
REPOSITORY="https://github.com/quiquemachado5/deuce.git"

if [[ ! -d "${ROOT}/.git" ]]; then
  git clone --branch main --single-branch "${REPOSITORY}" "${ROOT}"
fi

cd "${ROOT}"
git fetch origin main
git checkout main
git merge --ff-only origin/main
export SOURCE_COMMIT="$(git rev-parse HEAD)"

if [[ ! -f .env.production ]]; then
  echo "Missing ${ROOT}/.env.production." >&2
  exit 1
fi

docker compose --env-file .env.production up -d --build --remove-orphans

for attempt in {1..60}; do
  if docker compose --env-file .env.production exec -T web node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"; then
    docker compose --env-file .env.production exec -T web node -e "fetch('http://127.0.0.1:3000/api/cron/seed',{headers:{Authorization:'Bearer '+process.env.CRON_SECRET}}).then(async r=>{const body=await r.text();console.log(body);if(!r.ok)process.exit(1)})"
    for release_attempt in {1..24}; do
      if docker compose --env-file .env.production exec -T web node ops/verify-release.mjs --url=http://127.0.0.1:3000/api/health/deep --expected-commit="${SOURCE_COMMIT}"; then
        docker compose --env-file .env.production ps
        exit 0
      fi
      sleep 5
    done
    break
  fi
  sleep 5
done

docker compose --env-file .env.production logs --tail=200 web caddy scheduler
echo "DEUCE did not pass the release gate in five minutes." >&2
exit 1
