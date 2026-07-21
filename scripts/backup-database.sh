#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL wajib tersedia dari environment aman}"
BACKUP_ROOT="${BACKUP_DIRECTORY:-/var/backups/sdi-digital-library}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="${BACKUP_ROOT}/${STAMP}"

case "${BACKUP_ROOT}" in
  ''|'/'|'/var'|'/var/backups')
    printf 'BACKUP_DIRECTORY terlalu luas dan ditolak: %s\n' "${BACKUP_ROOT}" >&2
    exit 2
    ;;
esac

if [[ ! "${RETENTION_DAYS}" =~ ^[0-9]+$ ]] || (( RETENTION_DAYS < 7 )); then
  printf 'BACKUP_RETENTION_DAYS harus berupa angka minimal 7.\n' >&2
  exit 2
fi

install -d -m 0700 "${TARGET}"
pg_dump --dbname="${DATABASE_URL}" --format=custom --no-owner --no-acl --file="${TARGET}/database.dump"
pg_dumpall --dbname="${DATABASE_URL}" --roles-only --file="${TARGET}/roles.sql"
sha256sum "${TARGET}/database.dump" "${TARGET}/roles.sql" > "${TARGET}/SHA256SUMS"
find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d \
  -name '20??????T??????Z' -mtime "+${RETENTION_DAYS}" -print -exec rm -rf -- {} +

printf 'Backup database selesai: %s\n' "${TARGET}"
