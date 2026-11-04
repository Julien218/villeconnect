#!/usr/bin/env bash
# Sauvegarde quotidienne de la base. À planifier : crontab -e
#   15 3 * * * /opt/villeconnect/deploy/ionos/backup.sh >> /var/log/villeconnect-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")"
DEST=${BACKUP_DIR:-/var/backups/villeconnect}
KEEP_DAYS=${KEEP_DAYS:-14}
mkdir -p "$DEST"
FILE="$DEST/villeconnect-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose --env-file .env exec -T mysql sh -c \
  'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers --no-tablespaces villeconnect' \
  | gzip > "$FILE"
find "$DEST" -name 'villeconnect-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) sauvegarde OK : $FILE ($(du -h "$FILE" | cut -f1))"
# Recommandé : copier aussi hors du serveur (ex. rclone vers Cloudflare R2 ou IONOS S3).
