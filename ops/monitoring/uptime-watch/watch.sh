#!/usr/bin/env bash
# =====================================================================
#  SavdoPRO uptime watcher — near-zero-cost monitoring for a small box.
#
#  Prometheus+Grafana need ~300-500MB; on the 1GB prod droplet that would
#  OOM the app. This is the pragmatic alternative: a bash check on a 2-min
#  systemd timer that pings backend / license / Postgres / public-HTTPS /
#  disk and sends a Telegram alert ONLY on a state change (down->up /
#  up->down), so no spam. RAM cost ≈ a curl for ~1s every 2 min.
#
#  Config (env, e.g. /etc/savdopro/watch.env, 0600):
#    WATCH_BOT_TOKEN, WATCH_CHAT_ID  — Telegram alert destination
#    WATCH_HOST_LABEL                — prefix in messages (default "SavdoPRO prod")
#    WATCH_PUBLIC_URL                — public health URL (through nginx+TLS)
#    WATCH_DISK_PCT                  — disk-full threshold % (default 90)
# =====================================================================
set -u

ENV_FILE="${WATCH_ENV:-/etc/savdopro/watch.env}"
# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

BOT_TOKEN="${WATCH_BOT_TOKEN:-}"
CHAT_ID="${WATCH_CHAT_ID:-}"
STATE_DIR="${WATCH_STATE_DIR:-/var/lib/savdopro-watch}"
HOST_LABEL="${WATCH_HOST_LABEL:-SavdoPRO prod}"
PUBLIC_URL="${WATCH_PUBLIC_URL:-https://167-172-164-214.nip.io/actuator/health}"
BACKEND_URL="${WATCH_BACKEND_URL:-http://127.0.0.1:8086/actuator/health}"
LICENSE_URL="${WATCH_LICENSE_URL:-http://127.0.0.1:9090/actuator/health}"
DISK_THRESHOLD="${WATCH_DISK_PCT:-90}"

mkdir -p "$STATE_DIR"

tg() {
  [ -n "$BOT_TOKEN" ] && [ -n "$CHAT_ID" ] || return 0
  curl -s -m 10 "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${CHAT_ID}" \
    --data-urlencode "text=$1" >/dev/null 2>&1
}

now_stamp() { date '+%H:%M %d.%m.%Y'; }

# report <key> <human-name> <UP|DOWN> — Telegram only when the state flips.
report() {
  local key="$1" human="$2" now="$3" f prev
  f="$STATE_DIR/$key"
  prev="$(cat "$f" 2>/dev/null || echo UNKNOWN)"
  [ "$now" = "$prev" ] && return 0
  echo "$now" > "$f"
  if [ "$now" = DOWN ]; then
    tg "🔴 ${HOST_LABEL}: ${human} ISHLAMAYAPTI ($(now_stamp))"
  elif [ "$now" = UP ] && [ "$prev" = DOWN ]; then
    tg "🟢 ${HOST_LABEL}: ${human} tiklandi ($(now_stamp))"
  fi
}

# HTTP health with one retry — a single transient blip (or a ~70s restart
# window caught mid-flight) must not fire a false DOWN.
http_up() {
  curl -sf -m 6 "$1" 2>/dev/null | grep -q '"status":"UP"' && return 0
  sleep 8
  curl -sf -m 6 "$1" 2>/dev/null | grep -q '"status":"UP"'
}

# --- service checks ---
http_up "$BACKEND_URL" && report backend "Backend (kassa/API)" UP || report backend "Backend (kassa/API)" DOWN
http_up "$LICENSE_URL" && report license "License (login/billing)" UP || report license "License (login/billing)" DOWN
{ pg_isready -q 2>/dev/null || systemctl is-active --quiet postgresql; } \
  && report postgres "PostgreSQL" UP || report postgres "PostgreSQL" DOWN
http_up "$PUBLIC_URL" && report https "Sayt (HTTPS/nginx)" UP || report https "Sayt (HTTPS/nginx)" DOWN

# --- disk (own message so it can carry the % used) ---
USED="$(df --output=pcent / 2>/dev/null | tr -dc '0-9')"
if [ -n "$USED" ]; then
  dstate=$([ "$USED" -ge "$DISK_THRESHOLD" ] && echo FULL || echo OK)
  df_prev="$(cat "$STATE_DIR/disk" 2>/dev/null || echo UNKNOWN)"
  if [ "$dstate" != "$df_prev" ]; then
    echo "$dstate" > "$STATE_DIR/disk"
    [ "$dstate" = FULL ] && tg "🔴 ${HOST_LABEL}: Disk ${USED}% to'ldi — joy bo'shating!"
    [ "$dstate" = OK ] && [ "$df_prev" = FULL ] && tg "🟢 ${HOST_LABEL}: Disk normallashdi (${USED}%)"
  fi
fi
