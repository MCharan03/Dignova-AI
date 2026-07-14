#!/bin/sh
# Parse postgres DATABASE_URL into individual n8n env vars
if [ -n "$DATABASE_URL" ]; then
  eval $(node /home/node/parse_db.js)
fi

# Import workflow once after n8n boots (background, memory-capped)
if [ -f "/home/node/Dignova_Sentient_Master_Unified.json" ]; then
  (sleep 30 && n8n import:workflow --input=/home/node/Dignova_Sentient_Master_Unified.json) &
fi

exec /docker-entrypoint.sh "$@"
