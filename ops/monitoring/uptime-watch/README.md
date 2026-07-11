# Uptime watcher (small-box monitoring)

Prometheus + Grafana need ~300–500 MB. On the 1 GB prod droplet (free ≈ 84 MB)
that would OOM the backend. This is the pragmatic alternative: a bash check on
a **2-minute systemd timer** that pings backend / license / Postgres /
public-HTTPS / disk and sends a **Telegram alert only on a state change**
(down→up / up→down). Footprint ≈ one `curl` for ~1 s every 2 min — no
resident process, no container, no app restart.

For full metric **dashboards** (latency, heap, request rate) use
`../docker-compose.monitoring.yml` on a box with headroom (the 8 GB TezGo box,
or after migrating SavdoPRO to 2–4 GB). This watcher covers the #1 need —
"know the instant something goes down" — until then.

## Install (droplet)

```bash
# 1) script
install -D -m755 watch.sh /opt/barakat/monitoring/watch.sh
# 2) Telegram alert config (0600)
mkdir -p /etc/savdopro
cat > /etc/savdopro/watch.env <<'EOF'
WATCH_BOT_TOKEN=<telegram bot token>
WATCH_CHAT_ID=<chat id>
WATCH_HOST_LABEL="SavdoPRO prod"
EOF
chmod 600 /etc/savdopro/watch.env
# 3) systemd timer
cp savdopro-watch.service savdopro-watch.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now savdopro-watch.timer
```

> ⚠️ `watch.sh` sources `watch.env` as a shell file, so values with spaces
> MUST be quoted: `WATCH_HOST_LABEL="SavdoPRO prod"` (an unquoted space makes
> the shell try to run the second word as a command).

## Test the alert path (no real outage)

```bash
# fake DOWN (backend pointed at a dead port) → 🔴 alert
WATCH_BACKEND_URL=http://127.0.0.1:9999/x /opt/barakat/monitoring/watch.sh
# normal run → 🟢 recovered alert
/opt/barakat/monitoring/watch.sh
```

## What it checks

| Key | Target | Alert |
|---|---|---|
| backend | `127.0.0.1:8086/actuator/health` | 🔴 down / 🟢 recovered |
| license | `127.0.0.1:9090/actuator/health` | 🔴 down / 🟢 recovered |
| postgres | `pg_isready` / `systemctl is-active postgresql` | 🔴 down / 🟢 recovered |
| https | `https://<host>/actuator/health` (nginx+TLS) | 🔴 down / 🟢 recovered |
| disk | `df /` ≥ `WATCH_DISK_PCT` (default 90) | 🔴 full / 🟢 normal |

Each HTTP check retries once after 8 s, so a single blip or a ~70 s restart
window does not fire a false DOWN. State lives in `/var/lib/savdopro-watch/`.
