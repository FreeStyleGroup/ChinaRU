#!/bin/sh
set -e

# Прогон миграций, затем запуск API.
echo "→ Running migrations…"
node /app/apps/api/dist/migrate.js

echo "→ Starting API…"
exec node /app/apps/api/dist/server.js
