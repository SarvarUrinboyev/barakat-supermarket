#!/usr/bin/env bash
#
# SavdoPRO server-side deploy — idempotent, with a pre-deploy DB backup GATE,
# atomic release-symlink swap, localhost health check, and AUTOMATIC ROLLBACK.
#
# Runs ON the production server as the dedicated `deploy` user (D-2). The CI
# workflow (deploy.yml) uploads the built jar to
#   <base>/releases/<sha>/<jar>
# then invokes:  deploy.sh <unit> <sha>
#
#   unit = backend | license      (N5: default flow deploys backend; license is
#                                   deployed only on an explicit manual trigger)
#
# Model (D-1a): <base>/current is a SYMLINK to <base>/releases/<sha>/. The
# systemd unit's ExecStart runs `-jar <base>/current/<jar>`, so a release swap
# is just repointing the symlink + restart, and rollback is repointing it back.
#
# Config (optional): /etc/savdopro/deploy.env is sourced if present, for:
#   PGUSER PGPASSWORD PGDATABASE   — DB dump creds (backup-postgres.sh)
#   BACKUP_DIR RETENTION_DAYS      — dump location + retention
#   TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID  — optional deploy-result ping
#   KEEP_RELEASES                  — how many release dirs to retain (default 5)
#
# Privilege: only `sudo systemctl {restart,start,stop} savdopro-*` is needed,
# scoped NOPASSWD in sudoers (least privilege). The script never runs as root.
#
set -Eeuo pipefail

DEPLOY_ENV="${DEPLOY_ENV:-/etc/savdopro/deploy.env}"
# shellcheck disable=SC1090
[ -r "$DEPLOY_ENV" ] && . "$DEPLOY_ENV"

KEEP_RELEASES="${KEEP_RELEASES:-5}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log()  { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }
die()  { log "ERROR: $*"; notify "❌ deploy FAILED ($UNIT): $*"; exit 1; }

notify() {
  # Best-effort Telegram ping; never fails the deploy.
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] || return 0
  curl -sf -m 8 -o /dev/null \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=SavdoPRO deploy: $*" || true
}

# ---- per-unit configuration ----------------------------------------------
UNIT="${1:-}"
SHA="${2:-}"
[ -n "$UNIT" ] && [ -n "$SHA" ] || die "usage: deploy.sh <backend|license> <sha>"

case "$UNIT" in
  backend)
    BASE=/opt/barakat;  JAR=barakat-market.jar;            SERVICE=savdopro-backend
    HEALTH=http://127.0.0.1:8086/actuator/health ;;
  license)
    BASE=/opt/savdopro; JAR=savdopro-license-server.jar;   SERVICE=savdopro-license
    HEALTH=http://127.0.0.1:9090/actuator/health ;;
  *) die "unknown unit '$UNIT' (expected backend|license)" ;;
esac

RELEASE_DIR="$BASE/releases/$SHA"
CURRENT="$BASE/current"

# ---- 1) DB BACKUP — a GATE, not a step (N7) ------------------------------
# A failed backup ABORTS the deploy; we never ship on top of an un-backed-up DB.
if [ "$UNIT" = "backend" ]; then
  if [ -n "${PGDATABASE:-}" ] && [ -n "${PGUSER:-}" ]; then
    log "Pre-deploy DB dump ($PGDATABASE)…"
    BACKUP_DIR="${BACKUP_DIR:-/var/backups/savdopro}" \
      "$HERE/backup-postgres.sh" || die "pre-deploy DB backup failed — aborting (nothing swapped)"
  else
    die "DB backup creds not set (PGDATABASE/PGUSER in $DEPLOY_ENV) — refusing to deploy backend without a dump"
  fi
else
  log "License unit: H2 file DB, skipping pg_dump (its jar carries no schema risk)."
fi

# ---- 2) the uploaded release must exist ----------------------------------
[ -f "$RELEASE_DIR/$JAR" ] || die "release jar missing: $RELEASE_DIR/$JAR (did CI upload it?)"

# ---- 3) remember where to roll back to -----------------------------------
PREV_TARGET=""
if [ -L "$CURRENT" ]; then
  PREV_TARGET="$(readlink -f "$CURRENT")"
  log "current release: $PREV_TARGET"
fi

HEALTH_INTERVAL="${HEALTH_INTERVAL:-4}"   # seconds between polls (rehearsal sets 0)
health_ok() {
  for _ in $(seq 1 "${1:-40}"); do
    sleep "$HEALTH_INTERVAL"
    curl -sf -m 4 "$HEALTH" >/dev/null 2>&1 && return 0   # N6: localhost only
  done
  return 1
}

restart() { sudo systemctl restart "$SERVICE"; }

# ---- 4) swap the symlink + restart (idempotent) --------------------------
log "Pointing $CURRENT -> $RELEASE_DIR and restarting $SERVICE"
ln -sfn "$RELEASE_DIR" "$CURRENT"
restart

# ---- 5) health check -----------------------------------------------------
if health_ok 40; then
  log "health OK ✓"
else
  # ---- 6) AUTOMATIC ROLLBACK ---------------------------------------------
  log "health check FAILED — rolling back"
  if [ -n "$PREV_TARGET" ] && [ -d "$PREV_TARGET" ]; then
    ln -sfn "$PREV_TARGET" "$CURRENT"
    restart
    if health_ok 30; then
      log "rolled back to $PREV_TARGET, healthy"
      notify "⚠️ deploy of $SHA ($UNIT) failed health — auto-rolled back to $(basename "$PREV_TARGET"), service healthy. DB dump taken; DB restore is a human decision."
      exit 1
    fi
    die "rollback restart is ALSO unhealthy — manual intervention needed (prev=$PREV_TARGET)"
  fi
  die "health failed and no previous release to roll back to — manual intervention needed"
fi

# ---- 7) prune old releases (keep last N by mtime) ------------------------
if [ -d "$BASE/releases" ]; then
  # shellcheck disable=SC2012
  ls -1dt "$BASE"/releases/*/ 2>/dev/null | tail -n +"$((KEEP_RELEASES + 1))" | while read -r old; do
    old="${old%/}"
    [ "$old" = "$RELEASE_DIR" ] && continue
    [ "$old" = "$PREV_TARGET" ] && continue
    log "pruning old release $old"
    rm -rf "$old"
  done
fi

# ---- 8) done -------------------------------------------------------------
log "deploy OK ($UNIT @ $SHA)"
notify "✅ deploy OK: $UNIT @ ${SHA:0:12}"
