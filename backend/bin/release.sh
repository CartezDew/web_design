#!/usr/bin/env bash
set -euo pipefail

if [[ "${DJANGO_ENV:-}" != "production" ]]; then
  echo "release.sh is for production deployments only" >&2
  exit 1
fi

if [[ -z "${MIGRATION_DATABASE_URL:-}" ]]; then
  echo "MIGRATION_DATABASE_URL must be provided to the pre-deploy process" >&2
  exit 1
fi

export DATABASE_URL="${MIGRATION_DATABASE_URL}"
export ALLOW_PRODUCTION_MIGRATIONS=yes
python manage.py migrate --noinput
unset ALLOW_PRODUCTION_MIGRATIONS
unset DATABASE_URL
