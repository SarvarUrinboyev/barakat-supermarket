#!/usr/bin/env bash
#
# B4 — rollback rehearsal for ops/deploy.sh, run against a THROWAWAY target
# (no prod, no SSH). It drives the REAL deploy.sh unmodified inside a disposable
# container, with PATH shims that make the NEW release fail its health check and
# the OLD one pass — then asserts deploy.sh auto-reverts the `current` symlink to
# the previous release and exits non-zero. A rollback that has never fired is an
# untested artifact; this fires it.
#
# deploy.sh is injected via an env var (base64), so there is no bind-mount to
# get mangled by host path translation — the rehearsal runs the same on a dev
# laptop and on CI.
#
# Usage:  ops/deploy-rehearsal.sh          (needs Docker)
#
set -Eeuo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v docker >/dev/null 2>&1 || { echo "SKIP: Docker not available"; exit 0; }

DEPLOY_B64="$(base64 -w0 < "$HERE/deploy.sh" 2>/dev/null || base64 < "$HERE/deploy.sh" | tr -d '\n')"

# The scenario executed INSIDE the container.
read -r -d '' INNER <<'INNER_EOF' || true
set -Eeuo pipefail
mkdir -p /opt/ops
echo "$DEPLOY_B64" | base64 -d > /opt/ops/deploy.sh
chmod +x /opt/ops/deploy.sh

BASE=/opt/savdopro                       # the license unit (skips pg_dump)
mkdir -p "$BASE/releases/relOLD" "$BASE/releases/relNEW" /shim
echo "OLD-jar" > "$BASE/releases/relOLD/savdopro-license-server.jar"
echo "NEW-jar" > "$BASE/releases/relNEW/savdopro-license-server.jar"
ln -sfn "$BASE/releases/relOLD" "$BASE/current"     # currently on the OLD release

# --- PATH shims: intercept sudo / systemctl / curl -----------------------
cat > /shim/sudo <<'S'
#!/usr/bin/env bash
exec "$@"
S
cat > /shim/systemctl <<'S'
#!/usr/bin/env bash
echo "[shim systemctl] $*"     # no-op restart
S
# curl shim: health passes ONLY when `current` points at the OLD release,
# i.e. the NEW release is "broken". Any non-health curl (Telegram) succeeds.
cat > /shim/curl <<'S'
#!/usr/bin/env bash
for a in "$@"; do case "$a" in *actuator/health*)
  tgt="$(readlink -f /opt/savdopro/current || true)"
  case "$tgt" in *relNEW*) exit 22 ;; *) exit 0 ;; esac ;;
esac; done
exit 0
S
chmod +x /shim/sudo /shim/systemctl /shim/curl
export PATH="/shim:$PATH"

# --- drive the REAL deploy.sh: deploy relNEW (which is "broken") ----------
set +e
HEALTH_INTERVAL=0 bash /opt/ops/deploy.sh license relNEW
rc=$?
set -e

# --- assertions ----------------------------------------------------------
final="$(readlink -f /opt/savdopro/current)"
echo "---- rehearsal result ----"
echo "deploy.sh exit code : $rc   (expected non-zero — health failed)"
echo "current now points  : $final"
[ "$rc" -ne 0 ] || { echo "FAIL: deploy.sh exited 0 despite a failed health check"; exit 1; }
case "$final" in
  *relOLD) echo "PASS: auto-rolled back to the previous (OLD) release ✓" ;;
  *) echo "FAIL: current did not revert to relOLD (got $final)"; exit 1 ;;
esac
INNER_EOF

echo ">>> running rollback rehearsal in a disposable ubuntu container…"
docker run --rm -e DEPLOY_B64="$DEPLOY_B64" -e INNER="$INNER" \
  ubuntu:24.04 bash -c 'bash -c "$INNER"'
echo ">>> rehearsal complete."
