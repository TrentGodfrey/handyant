#!/usr/bin/env bash
set -Eeuo pipefail

CONFIG_FILE=/etc/mcq-ops.env
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)

if [[ ${1:-} == -h || ${1:-} == --help ]]; then
  echo "Usage: verify-latest-backup.sh [--config PATH]"
  exit 0
fi
if [[ ${1:-} == --config ]]; then
  [[ $# -ge 2 ]] || { echo "ERROR: --config needs a path" >&2; exit 2; }
  CONFIG_FILE=$2
  shift 2
fi
[[ $# -eq 0 ]] || {
  echo "Usage: verify-latest-backup.sh [--config PATH]" >&2
  exit 2
}
[[ -r "$CONFIG_FILE" ]] || {
  echo "ERROR: cannot read config: $CONFIG_FILE" >&2
  exit 1
}
# shellcheck disable=SC1090
source "$CONFIG_FILE"
: "${LOCAL_BACKUP_DIR:=/var/backups/mcq}"
: "${POSTGRES_SUPERUSER:=postgres}"

latest=$(
  find "$LOCAL_BACKUP_DIR" \
    -mindepth 1 -maxdepth 1 -type d \
    -name '20??????T??????Z' \
    -printf '%f\n' |
    sort -r |
    head -1
)
[[ -n "$latest" ]] || {
  echo "ERROR: no timestamped backup found below $LOCAL_BACKUP_DIR" >&2
  exit 1
}

POSTGRES_SUPERUSER="$POSTGRES_SUPERUSER" \
  "$SCRIPT_DIR/verify-backup.sh" "$LOCAL_BACKUP_DIR/$latest" --restore-test
