#!/bin/sh
# Parse DATABASE_URL into individual n8n postgres env vars
if [ -n "$DATABASE_URL" ]; then
  eval $(node /home/node/parse_db.js)
fi

exec /docker-entrypoint.sh "$@"
