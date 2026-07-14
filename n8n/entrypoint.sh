#!/bin/sh
if [ -n "$PORT" ]; then
  echo "Render PORT environment variable detected ($PORT). Routing n8n to listen on $PORT..."
  export N8N_PORT=$PORT
fi

if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL detected. Setting postgres connection..."
  export DB_TYPE=postgresdb
  export DB_POSTGRESDB_CONNECTION_DATABASE_URL=$DATABASE_URL
fi

if [ -f "/home/node/Dignova_Sentient_Master_Unified.json" ]; then
  (
    echo "Starting memory-optimized background workflow import monitor..."
    # Wait for the main server to initialize fully and settle its memory
    sleep 45
    echo "Attempting to import master workflow..."
    if NODE_OPTIONS="--max-old-space-size=128" n8n import:workflow --input=/home/node/Dignova_Sentient_Master_Unified.json; then
      echo "Master workflow imported successfully!"
    else
      echo "First import attempt failed. Waiting 30s for retry..."
      sleep 30
      if NODE_OPTIONS="--max-old-space-size=128" n8n import:workflow --input=/home/node/Dignova_Sentient_Master_Unified.json; then
        echo "Master workflow imported successfully on retry!"
      else
        echo "Workflow import failed. Skipping to avoid OOM."
      fi
    fi
  ) &
fi

exec /docker-entrypoint.sh "$@"
