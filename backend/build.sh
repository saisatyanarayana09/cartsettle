#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate --noinput
python manage.py seed_hackathon_catalog
python manage.py seed_showcase_sections
python manage.py sync_knowledge_index
