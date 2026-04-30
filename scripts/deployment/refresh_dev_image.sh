#!/usr/bin/env bash
set -euo pipefail

# Cron-safe PATH
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# -----------------------
# Config (override via env)
# -----------------------
IMAGE="${IMAGE:-ghcr.io/unisdr/delta-country:dev-latest}"
APP_SERVICE="${APP_SERVICE:-app}"
DB_SERVICE="${DB_SERVICE:-db}"
DB_NAME="${DB_NAME:-}"

COMPOSE_FILE="${COMPOSE_FILE:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups/db}"
LOCK_FILE="${LOCK_FILE:-/tmp/refresh_delta_image.lock}"


log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

run_compose() {
  if [[ -n "$COMPOSE_FILE" ]]; then
    docker compose -f "$COMPOSE_FILE" "$@"
  else
    docker compose "$@"
  fi
}

log "------------------------------"

mkdir -p "$BACKUP_DIR"

# Prevent overlapping runs from cron
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  log "Another refresh job is already running, skipping."
  exit 0
fi

cd "$PROJECT_DIR"

OLD_ID="$(docker image inspect "$IMAGE" --format '{{.Id}}' 2>/dev/null || true)"
log "Pulling image: $IMAGE"
docker pull "$IMAGE" >/dev/null
NEW_ID="$(docker image inspect "$IMAGE" --format '{{.Id}}')"

if [[ -n "$OLD_ID" && "$OLD_ID" == "$NEW_ID" ]]; then
  log "Image unchanged. No action needed."
  exit 0
fi

log "New image detected."

# Backup old image under backup tag
if [[ -n "$OLD_ID" ]]; then
  BACKUP_TAG="${IMAGE%:*}:dev-backup"

  if docker image inspect "$BACKUP_TAG" >/dev/null 2>&1; then
    docker image rm -f "$BACKUP_TAG" >/dev/null
    log "Removed existing backup image: $BACKUP_TAG"
  fi
  
  docker tag "$OLD_ID" "$BACKUP_TAG"
  log "Previous image backed up as: $BACKUP_TAG"
fi


# Database backup (PostgreSQL in db service/container)
DB_CID="$(run_compose ps -q "$DB_SERVICE" 2>/dev/null || true)"
if [[ -n "$DB_CID" ]]; then
  DB_NAME_EFFECTIVE="$DB_NAME"
  if [[ -z "$DB_NAME_EFFECTIVE" ]]; then
    DB_NAME_EFFECTIVE="$(docker exec "$DB_CID" sh -lc 'printf "%s" "${POSTGRES_DB:-postgres}"' 2>/dev/null || printf 'postgres')"
  fi

  DB_USER_EFFECTIVE="$(docker exec "$DB_CID" sh -lc 'printf "%s" "${POSTGRES_USER:-postgres}"' 2>/dev/null || printf 'postgres')"

  BACKUP_FILE="$BACKUP_DIR/${DB_NAME_EFFECTIVE}-BACKUP.sql"
  log "Creating DB backup: $BACKUP_FILE.gz"

  TMP_BACKUP_FILE="${BACKUP_FILE}.tmp"
  docker exec "$DB_CID" sh -lc 'PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump -U "$1" "$2"' sh "$DB_USER_EFFECTIVE" "$DB_NAME_EFFECTIVE" > "$TMP_BACKUP_FILE"

  if [[ ! -s "$TMP_BACKUP_FILE" ]]; then
    rm -f "$TMP_BACKUP_FILE"
    log "DB backup failed or empty output for DB '$DB_NAME_EFFECTIVE'."
    exit 1
  fi

  mv "$TMP_BACKUP_FILE" "$BACKUP_FILE"
  gzip -f "$BACKUP_FILE"
else
  log "DB service '$DB_SERVICE' is not running, skipping DB backup."
fi

log "Recreating app service: $APP_SERVICE"
run_compose up -d --no-deps --force-recreate "$APP_SERVICE"

log "Done. App restarted with latest image."