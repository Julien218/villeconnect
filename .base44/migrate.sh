#!/bin/sh
set -eu
sql() { mysql -h db -u villeconnect villeconnect "$@"; }
sql < /app/.base44/legacy-schema.sql
sql -e 'CREATE TABLE IF NOT EXISTS base44_migrations (name VARCHAR(190) PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
for file in /app/server/src/migrations/*.sql; do
  case "$file" in *_ROLLBACK.sql) continue ;; esac
  name=$(basename "$file")
  applied=$(sql -Nse "SELECT COUNT(*) FROM base44_migrations WHERE name='$name'")
  if [ "$applied" = 0 ]; then
    echo "Applying $name"
    sql < "$file"
    sql -e "INSERT INTO base44_migrations (name) VALUES ('$name')"
  fi
done
