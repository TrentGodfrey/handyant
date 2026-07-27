#!/usr/bin/env bash
set -Eeuo pipefail

PM2_USER=${PM2_USER:-webapps}
PM2_HOME=${PM2_HOME:-/home/webapps/.pm2}
PM2_SERVICE=${PM2_SERVICE:-pm2-webapps.service}
PM2_APP=${PM2_APP:-handyant}
PM2_APP_DIR=${PM2_APP_DIR:-/var/www/handyant}
PM2_PORT=${PM2_PORT:-3001}

failures=0
pass() { echo "PASS: $*"; }
fail() {
  echo "FAIL: $*" >&2
  failures=$((failures + 1))
}

if [[ ${1:-} == --help ]]; then
  cat <<'EOF'
Usage: validate-pm2-recovery.sh

Read-only validation that the webapps PM2 systemd unit, saved process list,
running process, port, and local HTTP response are ready for host recovery.
EOF
  exit 0
fi
[[ $# -eq 0 ]] || { echo "ERROR: unexpected arguments" >&2; exit 2; }

for command_name in curl node pm2 runuser ss systemctl; do
  command -v "$command_name" >/dev/null ||
    fail "required command is missing: $command_name"
done
((failures == 0)) || exit 1

if systemctl is-enabled --quiet "$PM2_SERVICE"; then
  pass "$PM2_SERVICE is enabled"
else
  fail "$PM2_SERVICE is not enabled"
fi
if systemctl is-active --quiet "$PM2_SERVICE"; then
  pass "$PM2_SERVICE is active"
else
  fail "$PM2_SERVICE is not active"
fi

pm2_json=$(
  runuser -u "$PM2_USER" -- \
    env PM2_HOME="$PM2_HOME" pm2 jlist 2>/dev/null
) || {
  pm2_json=
  fail "could not query PM2 as $PM2_USER"
}
if [[ -n "$pm2_json" ]] &&
  printf '%s' "$pm2_json" |
    node -e '
      let input="";
      process.stdin.on("data", chunk => input += chunk);
      process.stdin.on("end", () => {
        const app = JSON.parse(input).find(item => item.name === process.argv[1]);
        process.exit(app?.pm2_env?.status === "online" &&
          app?.pm2_env?.pm_cwd === process.argv[2] ? 0 : 1);
      });
    ' "$PM2_APP" "$PM2_APP_DIR"; then
  pass "$PM2_APP is online from $PM2_APP_DIR"
else
  fail "$PM2_APP is not online with the expected working directory"
fi

if [[ -r "$PM2_HOME/dump.pm2" ]] &&
  node -e '
    const fs = require("fs");
    const apps = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    process.exit(apps.some(app =>
      app.name === process.argv[2] && app.pm_cwd === process.argv[3]) ? 0 : 1);
  ' "$PM2_HOME/dump.pm2" "$PM2_APP" "$PM2_APP_DIR"; then
  pass "saved PM2 process list contains $PM2_APP"
else
  fail "saved PM2 process list is missing $PM2_APP"
fi

if command -v ss >/dev/null &&
  ss -ltn | awk '{print $4}' | grep -Eq "(^|:)$PM2_PORT$"; then
  pass "port $PM2_PORT is listening"
else
  fail "port $PM2_PORT is not listening"
fi

if ! local_code=$(
  curl --silent --show-error \
    --max-time 20 \
    --header 'Host: mcqpropertycare.com' \
    --output /dev/null \
    --write-out '%{http_code}' \
    "http://127.0.0.1:$PM2_PORT/"
); then
  local_code=000
fi
if [[ "$local_code" == 200 ]]; then
  pass "local MCQ application returned HTTP 200"
else
  fail "local MCQ application returned HTTP $local_code"
fi

if ((failures > 0)); then
  echo "$failures PM2 recovery validation check(s) failed." >&2
  exit 1
fi
echo "PM2 recovery validation passed."
