#!/usr/bin/env bash
set -euo pipefail

unset MIGRATION_DATABASE_URL
unset ALLOW_PRODUCTION_MIGRATIONS
python manage.py check --deploy
# Railway pre-deploy runs in a different container; collect into this app container.
python manage.py collectstatic --noinput
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers "${WEB_CONCURRENCY:-2}" --timeout 90
