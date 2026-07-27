#!/usr/bin/env bash
set -Eeuo pipefail

OPS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
tmp=$(mktemp -d "${TMPDIR:-/tmp}/mcq-ops-test.XXXXXX")
cleanup() {
  rm -rf -- "$tmp"
}
trap cleanup EXIT

echo "Checking shell syntax and help entrypoints"
for script in "$OPS_DIR"/bin/*.sh; do
  bash -n "$script"
  "$script" --help >/dev/null
done

echo "Checking health configuration"
"$OPS_DIR/bin/check-mcq-health.sh" \
  --config "$OPS_DIR/mcq-ops.env.example" \
  --check-config

echo "Checking backup configuration safety and dry-run"
mkdir -p "$tmp/app/storage/uploads" "$tmp/stub-bin"
sed \
  -e "s#^MCQ_APP_DIR=.*#MCQ_APP_DIR=$tmp/app#" \
  -e 's#^OFFSITE_TARGET=.*#OFFSITE_TARGET=test-remote:mcq#' \
  "$OPS_DIR/mcq-ops.env.example" >"$tmp/config.env"

for command_name in flock pg_dump pg_restore rclone runuser sha256sum tar; do
  printf '#!/bin/sh\nexit 0\n' >"$tmp/stub-bin/$command_name"
  chmod 0755 "$tmp/stub-bin/$command_name"
done
stub_path="$tmp/stub-bin:$PATH"

PATH="$stub_path" "$OPS_DIR/bin/backup-mcq.sh" \
  --config "$tmp/config.env" \
  --check-config
PATH="$stub_path" "$OPS_DIR/bin/backup-mcq.sh" \
  --config "$tmp/config.env" \
  --dry-run |
  grep -Fq 'no files or remote objects will be changed'

if PATH="$stub_path" "$OPS_DIR/bin/backup-mcq.sh" \
  --config "$OPS_DIR/mcq-ops.env.example" \
  --check-config >"$tmp/missing-offsite.log" 2>&1; then
  echo "ERROR: missing OFFSITE_TARGET unexpectedly passed" >&2
  exit 1
fi
grep -Fq 'OFFSITE_TARGET is mandatory' "$tmp/missing-offsite.log"

echo "Checking backup archive verification"
mkdir -p "$tmp/backup" "$tmp/archive/uploads" "$tmp/verify-bin"
printf 'fixture\n' >"$tmp/backup/database.dump"
printf 'created_at=test\n' >"$tmp/backup/metadata.txt"
tar -C "$tmp/archive" -czf "$tmp/backup/uploads.tar.gz" uploads
(
  cd "$tmp/backup"
  sha256sum database.dump uploads.tar.gz metadata.txt >SHA256SUMS
)
printf '#!/bin/sh\nexit 0\n' >"$tmp/verify-bin/pg_restore"
chmod 0755 "$tmp/verify-bin/pg_restore"
PATH="$tmp/verify-bin:$PATH" \
  "$OPS_DIR/bin/verify-backup.sh" "$tmp/backup" |
  grep -Fq 'Backup integrity verification passed.'

echo "Checking systemd unit structure"
for unit in "$OPS_DIR"/systemd/*.service; do
  grep -Fq '[Unit]' "$unit"
  grep -Fq '[Service]' "$unit"
  grep -Eq '^ExecStart=/' "$unit"
done
for timer in "$OPS_DIR"/systemd/*.timer; do
  grep -Fq '[Unit]' "$timer"
  grep -Fq '[Timer]' "$timer"
  grep -Fq '[Install]' "$timer"
  grep -Eq '^(OnCalendar|OnBootSec)=' "$timer"
done
for service in mcq-backup mcq-backup-verify mcq-health; do
  grep -Fq "Unit=$service.service" "$OPS_DIR/systemd/$service.timer"
done

echo "All MCQ operations tests passed."
