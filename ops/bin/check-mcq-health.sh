#!/usr/bin/env bash
set -Eeuo pipefail

CONFIG_FILE=/etc/mcq-ops.env
CHECK_ONLY=false

usage() {
  echo "Usage: check-mcq-health.sh [--config PATH] [--check-config]"
}

while (($#)); do
  case "$1" in
    --config)
      [[ $# -ge 2 ]] || { echo "ERROR: --config needs a path" >&2; exit 2; }
      CONFIG_FILE=$2
      shift 2
      ;;
    --check-config)
      CHECK_ONLY=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown argument: $1" >&2
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

: "${HEALTH_URL:=https://mcqpropertycare.com/}"
: "${HEALTH_EXPECT_TEXT:=MCQ Property Care}"
: "${HEALTH_TIMEOUT_SECONDS:=25}"
: "${HEALTH_FAILURE_THRESHOLD:=2}"
: "${HEALTH_ALERT_COOLDOWN_SECONDS:=21600}"
: "${HEALTH_STATE_DIR:=/run/mcq-health}"
: "${RESEND_API_KEY:=}"
: "${ALERT_FROM:=MCQ Monitor <anthony@mcqpropertycare.com>}"
: "${ALERT_TO:=}"

[[ "$HEALTH_URL" == https://* ]] || {
  echo "ERROR: HEALTH_URL must use HTTPS" >&2
  exit 1
}
[[ -n "$HEALTH_EXPECT_TEXT" ]] || {
  echo "ERROR: HEALTH_EXPECT_TEXT is required" >&2
  exit 1
}
for value_name in \
  HEALTH_TIMEOUT_SECONDS \
  HEALTH_FAILURE_THRESHOLD \
  HEALTH_ALERT_COOLDOWN_SECONDS; do
  value=${!value_name}
  [[ "$value" =~ ^[1-9][0-9]*$ ]] || {
    echo "ERROR: $value_name must be a positive integer" >&2
    exit 1
  }
done
if [[ -n "$RESEND_API_KEY" ]]; then
  [[ -n "$ALERT_FROM" && -n "$ALERT_TO" ]] || {
    echo "ERROR: ALERT_FROM and ALERT_TO are required when Resend is enabled" >&2
    exit 1
  }
  command -v jq >/dev/null || {
    echo "ERROR: jq is required for Resend alerts" >&2
    exit 1
  }
fi
command -v curl >/dev/null || {
  echo "ERROR: curl is required" >&2
  exit 1
}

if [[ "$CHECK_ONLY" == true ]]; then
  echo "Configuration is valid."
  exit 0
fi

mkdir -p "$HEALTH_STATE_DIR"
chmod 0700 "$HEALTH_STATE_DIR"
fails_file="$HEALTH_STATE_DIR/fails"
last_alert_file="$HEALTH_STATE_DIR/last_alert"
body_file=$(mktemp "$HEALTH_STATE_DIR/body.XXXXXX")
trap 'rm -f -- "$body_file"' EXIT

if ! code=$(
  curl --silent --show-error \
    --location \
    --max-time "$HEALTH_TIMEOUT_SECONDS" \
    --output "$body_file" \
    --write-out '%{http_code}' \
    "$HEALTH_URL"
); then
  code=000
fi

if [[ "$code" == 200 ]] && grep -Fq "$HEALTH_EXPECT_TEXT" "$body_file"; then
  printf '0\n' >"$fails_file"
  echo "MCQ health check passed: HTTP 200 and expected content found."
  exit 0
fi

previous_fails=$(cat "$fails_file" 2>/dev/null || printf '0')
[[ "$previous_fails" =~ ^[0-9]+$ ]] || previous_fails=0
fails=$((previous_fails + 1))
printf '%s\n' "$fails" >"$fails_file"
echo "MCQ health check failed: HTTP $code, consecutive failures: $fails" >&2

if ((fails < HEALTH_FAILURE_THRESHOLD)); then
  exit 1
fi

now=$(date +%s)
last_alert=$(cat "$last_alert_file" 2>/dev/null || printf '0')
[[ "$last_alert" =~ ^[0-9]+$ ]] || last_alert=0
if ((now - last_alert < HEALTH_ALERT_COOLDOWN_SECONDS)); then
  exit 1
fi

if [[ -z "$RESEND_API_KEY" ]]; then
  echo "No Resend alert key configured; failure is visible via exit status/logs." >&2
  exit 1
fi

subject="ALERT: MCQ production health check failed"
text="The MCQ production check returned HTTP $code or missing expected content on $fails consecutive checks. URL: $HEALTH_URL"
payload=$(
  jq -n \
    --arg from "$ALERT_FROM" \
    --arg to "$ALERT_TO" \
    --arg subject "$subject" \
    --arg text "$text" \
    '{from:$from,to:[$to],subject:$subject,text:$text}'
)
if ! alert_code=$(
  curl --silent --show-error \
    --max-time "$HEALTH_TIMEOUT_SECONDS" \
    --output /dev/null \
    --write-out '%{http_code}' \
    --request POST \
    --header "Authorization: Bearer $RESEND_API_KEY" \
    --header 'Content-Type: application/json' \
    --data "$payload" \
    https://api.resend.com/emails
); then
  alert_code=000
fi
if [[ "$alert_code" =~ ^2[0-9][0-9]$ ]]; then
  printf '%s\n' "$now" >"$last_alert_file"
  echo "Failure alert sent."
else
  echo "ERROR: Resend alert failed with HTTP $alert_code" >&2
fi
exit 1
