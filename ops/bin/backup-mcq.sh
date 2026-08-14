#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

CONFIG_FILE=/etc/mcq-ops.env
MODE=run

usage() {
  cat <<'EOF'
Usage: backup-mcq.sh [--config PATH] [--check-config] [--dry-run]

Creates an atomic PostgreSQL + storage/uploads backup, verifies it, copies it
off-host with rclone, and only then prunes expired local/off-host backups.
EOF
}

while (($#)); do
  case "$1" in
    --config)
      [[ $# -ge 2 ]] || { echo "ERROR: --config needs a path" >&2; exit 2; }
      CONFIG_FILE=$2
      shift 2
      ;;
    --check-config)
      MODE=check
      shift
      ;;
    --dry-run)
      MODE=dry-run
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

[[ -r "$CONFIG_FILE" ]] || {
  echo "ERROR: cannot read config: $CONFIG_FILE" >&2
  exit 1
}
# shellcheck disable=SC1090
source "$CONFIG_FILE"

: "${MCQ_APP_DIR:=/var/www/handyant}"
: "${POSTGRES_DB:=handyant}"
: "${POSTGRES_SUPERUSER:=postgres}"
: "${LOCAL_BACKUP_DIR:=/var/backups/mcq}"
: "${LOCAL_RETENTION_DAYS:=7}"
: "${OFFSITE_RETENTION_DAYS:=30}"
: "${MIN_FREE_KB:=1048576}"
: "${OFFSITE_TARGET:=}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

is_positive_integer() {
  [[ "$1" =~ ^[1-9][0-9]*$ ]]
}

validate_config() {
  [[ "$MCQ_APP_DIR" == /* ]] || fail "MCQ_APP_DIR must be absolute"
  [[ "$LOCAL_BACKUP_DIR" == /var/backups/* ]] ||
    fail "LOCAL_BACKUP_DIR must be below /var/backups"
  [[ "$LOCAL_BACKUP_DIR" != /var/backups/ ]] ||
    fail "LOCAL_BACKUP_DIR must not be /var/backups itself"
  [[ "$LOCAL_BACKUP_DIR" != *"/../"* && "$LOCAL_BACKUP_DIR" != *"/.." ]] ||
    fail "LOCAL_BACKUP_DIR must not contain parent-directory traversal"
  [[ -n "$POSTGRES_DB" ]] || fail "POSTGRES_DB is required"
  [[ "$POSTGRES_DB" =~ ^[A-Za-z0-9_-]+$ ]] ||
    fail "POSTGRES_DB contains unsupported characters"
  [[ "$POSTGRES_SUPERUSER" =~ ^[A-Za-z0-9_-]+$ ]] ||
    fail "POSTGRES_SUPERUSER contains unsupported characters"
  is_positive_integer "$LOCAL_RETENTION_DAYS" ||
    fail "LOCAL_RETENTION_DAYS must be a positive integer"
  is_positive_integer "$OFFSITE_RETENTION_DAYS" ||
    fail "OFFSITE_RETENTION_DAYS must be a positive integer"
  is_positive_integer "$MIN_FREE_KB" ||
    fail "MIN_FREE_KB must be a positive integer"
  [[ -n "$OFFSITE_TARGET" ]] ||
    fail "OFFSITE_TARGET is mandatory; configure an rclone remote"
  [[ "$OFFSITE_TARGET" != /* ]] ||
    fail "OFFSITE_TARGET must be an rclone remote, not a local path"
  [[ "$OFFSITE_TARGET" == *:* ]] ||
    fail "OFFSITE_TARGET must include an rclone remote name"
  [[ -d "$MCQ_APP_DIR/storage/uploads" ]] ||
    fail "upload directory does not exist: $MCQ_APP_DIR/storage/uploads"

  local command_name
  for command_name in flock pg_dump pg_restore rclone sha256sum tar; do
    command -v "$command_name" >/dev/null ||
      fail "required command not found: $command_name"
  done
  if [[ "$(id -un)" != "$POSTGRES_SUPERUSER" ]]; then
    command -v runuser >/dev/null || fail "runuser is required"
  fi
}

validate_config

if [[ "$MODE" == check ]]; then
  echo "Configuration is valid."
  exit 0
fi

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
final_dir="${LOCAL_BACKUP_DIR%/}/$timestamp"
remote_dir="${OFFSITE_TARGET%/}/$timestamp"
[[ ! -e "$final_dir" ]] || fail "backup destination already exists: $final_dir"

if [[ "$MODE" == dry-run ]]; then
  cat <<EOF
Dry run only; no files or remote objects will be changed.
Application: $MCQ_APP_DIR
Database: $POSTGRES_DB
Local destination: $final_dir
Off-host destination: $remote_dir
Local retention: $LOCAL_RETENTION_DAYS days
Off-host retention: $OFFSITE_RETENTION_DAYS days
EOF
  exit 0
fi

mkdir -p "$LOCAL_BACKUP_DIR" /run/lock
chmod 0700 "$LOCAL_BACKUP_DIR"
canonical_backup_dir=$(cd "$LOCAL_BACKUP_DIR" && pwd -P)
[[ "$canonical_backup_dir" == /var/backups/* ]] ||
  fail "LOCAL_BACKUP_DIR resolves outside /var/backups"
LOCAL_BACKUP_DIR=$canonical_backup_dir
final_dir="${LOCAL_BACKUP_DIR%/}/$timestamp"
[[ ! -e "$final_dir" ]] || fail "backup destination already exists: $final_dir"
exec 9>/run/lock/mcq-backup.lock
flock -n 9 || fail "another MCQ backup is already running"

available_kb=$(df -Pk "$LOCAL_BACKUP_DIR" | awk 'NR == 2 {print $4}')
[[ "$available_kb" =~ ^[0-9]+$ ]] ||
  fail "could not determine available disk space"
((available_kb >= MIN_FREE_KB)) ||
  fail "only ${available_kb}KB free; minimum is ${MIN_FREE_KB}KB"

work_dir=$(mktemp -d "${LOCAL_BACKUP_DIR%/}/.${timestamp}.partial.XXXXXX")
# The if-form matters: `[[ -d ... ]] && rm` leaves the trap with status 1 once
# work_dir is cleared, and under `set -e` that turns every successful backup
# into an exit-code-1 "failure" for systemd.
cleanup() {
  if [[ -d "${work_dir:-}" ]]; then
    rm -rf -- "$work_dir"
  fi
}
trap cleanup EXIT

echo "[$(date -u +%FT%TZ)] dumping PostgreSQL database"
if [[ "$(id -un)" == "$POSTGRES_SUPERUSER" ]]; then
  pg_dump --format=custom --no-owner --no-acl \
    "$POSTGRES_DB" >"$work_dir/database.dump"
else
  runuser -u "$POSTGRES_SUPERUSER" -- \
    pg_dump --format=custom --no-owner --no-acl \
    "$POSTGRES_DB" >"$work_dir/database.dump"
fi

echo "[$(date -u +%FT%TZ)] archiving uploads"
tar -C "$MCQ_APP_DIR/storage" -czf "$work_dir/uploads.tar.gz" uploads

release=unknown
if [[ -r "$MCQ_APP_DIR/.release-commit" ]]; then
  release=$(head -c 40 "$MCQ_APP_DIR/.release-commit" | tr -cd 'A-Fa-f0-9')
  [[ -n "$release" ]] || release=unknown
fi
cat >"$work_dir/metadata.txt" <<EOF
created_at=$timestamp
database=$POSTGRES_DB
release_commit=$release
hostname=$(hostname -f 2>/dev/null || hostname)
EOF

(
  cd "$work_dir"
  sha256sum database.dump uploads.tar.gz metadata.txt >SHA256SUMS
  sha256sum -c SHA256SUMS
  pg_restore --list database.dump >/dev/null
  tar -tzf uploads.tar.gz >/dev/null
)

chmod 0600 "$work_dir"/*
mv "$work_dir" "$final_dir"
work_dir=

echo "[$(date -u +%FT%TZ)] copying backup off-host"
rclone copy "$final_dir" "$remote_dir" \
  --checksum \
  --create-empty-src-dirs \
  --transfers 4 \
  --checkers 8
rclone check "$final_dir" "$remote_dir" --checksum --one-way

echo "[$(date -u +%FT%TZ)] pruning expired off-host backup files"
rclone delete "${OFFSITE_TARGET%/}" \
  --min-age "${OFFSITE_RETENTION_DAYS}d" \
  --include '/20??????T??????Z/**' \
  --exclude '/**'

echo "[$(date -u +%FT%TZ)] pruning expired local backup directories"
find "$LOCAL_BACKUP_DIR" \
  -mindepth 1 -maxdepth 1 -type d \
  -name '20??????T??????Z' \
  -mtime "+$LOCAL_RETENTION_DAYS" \
  -print -exec rm -rf -- {} +

echo "[$(date -u +%FT%TZ)] backup complete: $final_dir"
