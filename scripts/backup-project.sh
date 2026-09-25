#!/usr/bin/env bash
# Sauvegarde MANUELLE du dépôt et de la base LOCALE Base44 (pas Railway).
# Usage: BACKUP_RECIPIENT=<empreinte-cle-publique-GPG> bash scripts/backup-project.sh /stockage/prive
set -euo pipefail
umask 077
: "${BACKUP_RECIPIENT:?Indiquer votre empreinte de clé publique GPG dans BACKUP_RECIPIENT}"
output=${1:?Indiquer un dossier de sauvegarde privé hors du dépôt}
root=$(git rev-parse --show-toplevel)
cd "$root"
for tool in docker git tar gpg sha256sum; do command -v "$tool" >/dev/null; done
mkdir -p "$output"
output=$(cd "$output" && pwd -P)
case "$output/" in "$root/"*) echo 'La sauvegarde doit être hors du dépôt.' >&2; exit 1;; esac
# Toutes les branches connues localement, jamais de fetch ni de push implicite.
# Un état sale ferait croire à tort que les dernières modifications sont sauvegardées.
if [ -n "$(git status --porcelain)" ]; then
  echo 'Attendre que les changements soient enregistrés dans Git avant la sauvegarde.' >&2
  exit 1
fi
gpg --batch --list-keys "$BACKUP_RECIPIENT" >/dev/null 2>&1
work=$(mktemp -d)
partial=''
trap 'rm -rf -- "$work"; if [ -n "$partial" ]; then rm -f -- "$partial"; fi' EXIT
stamp=$(date -u +%Y%m%dT%H%M%SZ)
base="villeconnect-local-$stamp-$$.tar.gpg"
partial="$output/.$base.partial"
git bundle create "$work/project.bundle" --all
git bundle verify "$work/project.bundle" >/dev/null 2>&1
docker compose -f docker-compose.base44.yml exec -T db sh -ec \
  'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -u"$MYSQL_USER" --single-transaction --no-tablespaces --routines --triggers --events --set-gtid-purged=OFF "$MYSQL_DATABASE"' \
  > "$work/database.sql"
test -s "$work/database.sql"
printf 'scope=base44-local\ncreated_utc=%s\ncommit=%s\nsecrets=excluded\n' "$stamp" "$(git rev-parse HEAD)" > "$work/manifest.txt"
tar -C "$work" -czf - project.bundle database.sql manifest.txt | \
  gpg --batch --encrypt --recipient "$BACKUP_RECIPIENT" --output "$partial"
# Ne rendre visible une sauvegarde finale que lorsque toute la chaîne a réussi.
mv -- "$partial" "$output/$base"
partial=''
(cd "$output" && sha256sum "$base" > "$base.sha256")
printf 'Sauvegarde locale chiffrée : %s\nCopier hors de cet environnement et tester la restauration.\n' "$output/$base"
