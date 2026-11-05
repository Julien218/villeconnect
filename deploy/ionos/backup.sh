#!/usr/bin/env bash
# Sauvegarde quotidienne de la base VilleConnect, chiffrée, avec copie hors du serveur.
# À planifier : crontab -e
#   15 3 * * * /opt/villeconnect/deploy/ionos/backup.sh >> /var/log/villeconnect-backup.log 2>&1
#
# Variables facultatives (dans /opt/villeconnect/deploy/ionos/backup.env) :
#   BACKUP_AGE_RECIPIENT=age1...    clé publique « age » : la sauvegarde est chiffrée, seule la clé
#                                   privée (gardée HORS du serveur) peut la relire.
#   BACKUP_RCLONE_REMOTE=r2:villeconnect-backups   destination hors serveur (rclone configuré).
#   BACKUP_HEALTHCHECK_URL=https://hc-ping.com/... prévient si la sauvegarde n'a pas eu lieu.
set -euo pipefail
cd "$(dirname "$0")"
[ -f backup.env ] && . ./backup.env

DEST=${BACKUP_DIR:-/var/backups/villeconnect}
KEEP_DAYS=${KEEP_DAYS:-14}
mkdir -p "$DEST" && chmod 700 "$DEST"
FILE="$DEST/villeconnect-$(date +%Y%m%d-%H%M%S).sql.gz"

docker compose --env-file .env exec -T mysql sh -c \
  'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers --no-tablespaces villeconnect' \
  | gzip > "$FILE"

# Une sauvegarde vide ou tronquée est pire que pas de sauvegarde : on vérifie.
gzip -t "$FILE"
if ! zcat "$FILE" | tail -n 1 | grep -q "Dump completed"; then
  echo "$(date -Is) ÉCHEC : sauvegarde incomplète ($FILE)" >&2
  exit 1
fi

if [ -n "${BACKUP_AGE_RECIPIENT:-}" ]; then
  age -r "$BACKUP_AGE_RECIPIENT" -o "$FILE.age" "$FILE" && rm -f "$FILE"
  FILE="$FILE.age"
fi
chmod 600 "$FILE"

if [ -n "${BACKUP_RCLONE_REMOTE:-}" ]; then
  rclone copy "$FILE" "$BACKUP_RCLONE_REMOTE/" --quiet
fi

find "$DEST" -name 'villeconnect-*.sql.gz*' -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) sauvegarde OK : $FILE ($(du -h "$FILE" | cut -f1))"
[ -n "${BACKUP_HEALTHCHECK_URL:-}" ] && curl -fsS -m 10 "$BACKUP_HEALTHCHECK_URL" >/dev/null || true
