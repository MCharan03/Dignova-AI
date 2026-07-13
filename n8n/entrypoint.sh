#!/bin/sh
if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL detected. Parsing configuration..."
  eval $(node /home/node/parse_db.js)
fi

if [ -f "/home/node/Dignova_Sentient_Master_Unified.json" ]; then
  (
    echo "Starting robust background workflow import monitor..."
    for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
      sleep 15
      echo "Attempting to import master workflow (Attempt $i)..."
      if n8n import:workflow --input=/home/node/Dignova_Sentient_Master_Unified.json; then
        echo "Master workflow imported successfully!"
        break
      else
        echo "Workflow import attempt $i failed. Retrying..."
      fi
    done
  ) &
fi

exec /docker-entrypoint.sh "$@"
