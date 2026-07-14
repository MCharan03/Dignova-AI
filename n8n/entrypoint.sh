#!/bin/sh
if [ -n "$PORT" ]; then
  echo "Render PORT environment variable detected ($PORT). Routing n8n to listen on $PORT..."
  export N8N_PORT=$PORT
fi

if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL detected. Parsing postgres credentials..."
  eval $(node /home/node/parse_db.js)
  
  # Verify PostgreSQL is reachable before committing to it
  echo "Testing PostgreSQL connection..."
  if node -e "
    const { Client } = require('pg');
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
    c.connect().then(() => { console.log('POSTGRES_OK'); c.end(); }).catch(e => { console.error('POSTGRES_FAIL:', e.message); process.exit(1); });
  " 2>/dev/null; then
    echo "PostgreSQL connection verified."
  else
    echo "PostgreSQL connection failed. Falling back to SQLite..."
    export DB_TYPE=sqlite
    unset DB_POSTGRESDB_HOST DB_POSTGRESDB_PORT DB_POSTGRESDB_DATABASE DB_POSTGRESDB_USER DB_POSTGRESDB_PASSWORD
  fi
else
  echo "No DATABASE_URL set. Using SQLite (default)..."
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
