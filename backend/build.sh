#!/usr/bin/env bash
# Render's build command for the backend (Root Directory: backend). Runs on every deploy, before
# the new version starts; Render Free has no shell, so everything a deploy needs happens here.
# Migrating here (not at start-up) keeps waking a sleeping free instance fast.
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate --noinput
python manage.py createcachetable  # rate-limit counters (no-op once the table exists)
# Translations need no build step: locale/*/django.mo is committed (Render can't install gettext).
