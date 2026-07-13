#!/bin/sh
if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL detected. Parsing configuration..."
  eval $(node /home/node/parse_db.js)
fi

if [ -f "/home/node/Dignova_Sentient_Master_Unified.json" ]; then
  (
    echo "Waiting for database and n8n migrations to settle..."
    sleep 45
    echo "Importing master workflow..."
    n8n import:workflow --input=/home/node/Dignova_Sentient_Master_Unified.json || echo "Workflow import failed"
  ) &
fi

exec /docker-entrypoint.sh "$@"
