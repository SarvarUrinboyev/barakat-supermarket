# Remote monitoring (Prometheus + Grafana on a separate box)

The 1 GB prod droplet can't host Prometheus+Grafana (would OOM the app). This
variant runs the stack on a box **with headroom** and scrapes SavdoPRO's
backend `/actuator/prometheus` **remotely** over public HTTPS + a Bearer
scrape token. Deployed live on the TezGo box (46.101.207.92, 8 GB) — it uses
~300 MB there, invisible next to TezGo's own services.

## What's where (live, 2026-07-02)

- Prometheus → `127.0.0.1:9091` on the monitoring box (30-day retention)
- Grafana → `127.0.0.1:3009` (3001 was taken by TezGo's admin Next.js)
- Both bound to loopback — reach them via SSH tunnel, not publicly.
- Scrape target: `https://167-172-164-214.nip.io/actuator/prometheus`,
  auth = Bearer `METRICS_SCRAPE_TOKEN` (set on the SavdoPRO backend via the
  `40-metrics.conf` systemd drop-in).

## Deploy on the monitoring box

```bash
mkdir -p /opt/monitoring/{prometheus,secrets,grafana/provisioning/datasources,grafana/provisioning/dashboards,grafana/dashboards}
# 1) scrape token — MUST equal METRICS_SCRAPE_TOKEN on the SavdoPRO backend.
printf '%s' '<token>' > /opt/monitoring/secrets/scrape-token
chmod 644 /opt/monitoring/secrets/scrape-token   # prom container (uid 65534) must read it
# 2) copy prometheus.remote.yml, docker-compose.remote.yml (this dir) +
#    ../grafana/provisioning/datasources/prometheus.yml,
#    ../grafana/provisioning/dashboards/provider.yml,
#    ../grafana/dashboards/savdopro-overview.json
cd /opt/monitoring && docker compose -f docker-compose.remote.yml up -d
```

> **Gotcha:** the scrape-token file must be readable by the Prometheus
> container user (uid 65534) — `chmod 644`, not 600. A 600 root file gives
> `permission denied: /etc/prometheus/scrape-token` and the target stays down.

## Access (SSH tunnel from your laptop)

```bash
ssh -i ~/.ssh/tezyol_vps -L 3009:127.0.0.1:3009 root@46.101.207.92
# then open http://localhost:3009  (admin / <password>)
# dashboard: "SavdoPRO Overview"
```

## Verify

```bash
# on the box:
curl -s 'http://localhost:9091/api/v1/query?query=up{job="savdopro-backend"}'   # → 1
```

## To also scrape the license server

nginx on SavdoPRO only routes `/actuator/*` to the backend, so the license
server's metrics aren't publicly reachable. To add them: expose a token-gated
nginx location (e.g. `/license/actuator/prometheus` → `127.0.0.1:9090/...`) and
add a second job here. Backend metrics cover the POS/API hot path.
