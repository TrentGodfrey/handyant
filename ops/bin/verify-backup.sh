#!/usr/bin/env bash
set -Eeuo pipefail

RESTORE_TEST=false
POSTGRES_SUPERUSER=${POSTGRES_SUPERUSER:-postgres}

usage() {
  cat <<'EOF'
Usage: verify-backup.sh BACKUP_DIRECTORY [--restore-test]

Always verifies checksums and archive readability. With --restore-test, restores
the dump into a disposable PostgreSQL database and drops it on exit.
EOF
}

if [[ ${1:-} == -h || ${1:-} == --help ]]; then
  usage
  exit 0
fi
[[ $# -ge 1 ]] || { usage >&2; exit 2; }
BACKUP_DIR=$1
shift
while (($#)); do
  case "$1" in
    --restore-test)
      RESTORE_TEST=true
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

[[ -d "$BACKUP_DIR" ]] || {
  echo "ERROR: backup directory not found: $BACKUP_DIR" >&2
  exit 1
}
BACKUP_DIR=$(cd "$BACKUP_DIR" && pwd -P)

for file in database.dump uploads.tar.gz metadata.txt SHA256SUMS; do
  [[ -f "$BACKUP_DIR/$file" ]] || {
    echo "ERROR: missing backup file: $file" >&2
    exit 1
  }
done

echo "Verifying checksums and archive structure"
(
  cd "$BACKUP_DIR"
  sha256sum -c SHA256SUMS
  pg_restore --list database.dump >/dev/null
  tar -tzf uploads.tar.gz >/dev/null
)

if [[ "$RESTORE_TEST" != true ]]; then
  echo "Backup integrity verification passed."
  exit 0
fi

for command_name in createdb dropdb pg_restore psql; do
  command -v "$command_name" >/dev/null || {
    echo "ERROR: required command not found: $command_name" >&2
    exit 1
  }
done
if [[ "$(id -un)" != "$POSTGRES_SUPERUSER" ]]; then
  command -v runuser >/dev/null || {
    echo "ERROR: runuser is required for restore testing" >&2
    exit 1
  }
fi

test_db="mcq_restore_check_$(date -u +%Y%m%d%H%M%S)_$$"
[[ "$test_db" =~ ^[a-zA-Z0-9_]+$ ]] || {
  echo "ERROR: unsafe generated database name" >&2
  exit 1
}

as_postgres() {
  if [[ "$(id -un)" == "$POSTGRES_SUPERUSER" ]]; then
    "$@"
  else
    runuser -u "$POSTGRES_SUPERUSER" -- "$@"
  fi
}

cleanup_database() {
  if [[ ${test_database_created:-false} == true ]]; then
    as_postgres dropdb --if-exists "$test_db" >/dev/null 2>&1 || true
  fi
}
trap cleanup_database EXIT

echo "Restoring into disposable database: $test_db"
as_postgres createdb "$test_db"
test_database_created=true
if [[ "$(id -un)" == "$POSTGRES_SUPERUSER" ]]; then
  pg_restore \
    --exit-on-error \
    --no-owner \
    --no-acl \
    --dbname="$test_db" \
    <"$BACKUP_DIR/database.dump"
else
  runuser -u "$POSTGRES_SUPERUSER" -- \
    pg_restore \
    --exit-on-error \
    --no-owner \
    --no-acl \
    --dbname="$test_db" \
    <"$BACKUP_DIR/database.dump"
fi

table_count=$(
  as_postgres psql -X -A -t -v ON_ERROR_STOP=1 \
    --dbname="$test_db" \
    --command="SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
)
[[ "$table_count" =~ ^[0-9]+$ ]] && ((table_count > 0)) || {
  echo "ERROR: restored database has no public tables" >&2
  exit 1
}

echo "Restore verification passed with $table_count public tables."
