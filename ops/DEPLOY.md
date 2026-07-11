# SavdoPRO — CI/CD & Deploy

Zero-manual-step releases. Push → tests (`ci.yml`). Trigger a deploy → build +
DB-backup + release-swap + health-check + **automatic rollback** (`deploy.yml`
→ `ops/deploy.sh`).

> **First Gate C prod release does NOT use this pipeline.** That one follows the
> manual runbook night (Flyway V38–V40 → P1 disposal → EXT-1 relabel → verify →
> traffic; `docs/ops/gate-c-p1-cleanup.md`). The pipeline is for routine releases
> after Gate C ships. The pipeline never runs one-time ops steps.

---

## Normal flow

1. Work on a feature branch — every push runs `ci.yml` (backend + license +
   Postgres-Flyway + **frontend vitest** + build + staging E2E). Red CI blocks merge.
2. Open a PR to `main`; merge when CI is green **and** store load is low.
3. Deploy: **Actions → Deploy → Run workflow**, pick the unit (default `backend`).
   Merging is the release "go"; the deploy is the button — until the flip below.

## Trigger (today: manual)

`deploy.yml` is `workflow_dispatch` only, with a `unit` input (`backend` |
`license`). Backend is the routine path (the SPA is bundled into the backend
jar); **license deploys are manual-only** and rare.

### The Gate-C flip → auto-on-merge

After Gate C ships, uncomment in `deploy.yml`:

```yaml
on:
  workflow_dispatch: { ... }
  push:
    branches: [main]
```

That's the entire switch. From then on, a merge to `main` deploys `backend`
automatically. Revert the two lines to go back to button-only.

## What a deploy does (`ops/deploy.sh <unit> <sha>`, server-side)

1. **DB dump — a GATE, not a step.** `backup-postgres.sh` runs first; if it
   fails, the deploy ABORTS (nothing is swapped). Backend only (license is H2).
2. The CI-uploaded jar must exist at `<base>/releases/<sha>/`.
3. Repoint `<base>/current` → `releases/<sha>/`, `sudo systemctl restart <unit>`.
4. Health-check `http://127.0.0.1:<port>/actuator/health` over localhost (no
   dependency on public exposure), with a timeout.
5. **On health failure → automatic rollback:** repoint `current` to the previous
   release, restart, re-health, notify. `exit 1`. A **DB restore is never
   automatic** — the dump is taken; restoring it is a human decision.
6. Prune old releases (keep last `KEEP_RELEASES`, default 5).

Rollback is rehearsed by `ops/deploy-rehearsal.sh` (drives the real `deploy.sh`
in a throwaway container with a deliberately-unhealthy new release; asserts the
symlink reverts). Run it any time: `bash ops/deploy-rehearsal.sh` (needs Docker).

## Secrets & variables (GitHub → Settings → Secrets and variables → Actions)

| Kind | Name | Value |
|---|---|---|
| secret | `DEPLOY_SSH_KEY` | private key of the dedicated CI **`deploy`** user (not root) |
| secret | `DEPLOY_HOST` | `168.119.64.239` / `savdopro.topsites.uz` |
| secret | `DEPLOY_USER` | `deploy` |
| secret | `DEPLOY_PORT` | optional, default `22` |
| variable | `LICENSE_URL` | public host (→ `VITE_LICENSE_URL`) |
| variable | `MXIK_PROXY_URL` | optional (→ `VITE_MXIK_PROXY_URL`); blank = off. **D1's home.** |
| secret | `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | optional; set in the server's `deploy.env` for a deploy-result ping |

### Secret rotation
Rotate the deploy key: generate a new keypair, add the new **public** key to the
`deploy` user's `~/.ssh/authorized_keys`, update `DEPLOY_SSH_KEY`, then remove the
old public key. No downtime — the next deploy uses the new key.

## Branch protection (recommend — Sarvar clicks once)

Settings → Branches → add rule for `main`:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass → select the `ci.yml` jobs
  (Backend tests, License-server tests, License Flyway on Postgres,
  Frontend unit tests + build, E2E smoke)
- ✅ Require branches to be up to date before merging

Push policy: feature branches push continuously (CI on every push); `main` =
releases only.

## Server prerequisites (one-time, during the SSH-restored window)

The release-symlink model needs a small, documented setup — recorded here so the
SSH visit that adds the CI key also lands these:

1. **Dedicated `deploy` user** owning `/opt/barakat` and `/opt/savdopro`; its
   `authorized_keys` holds the CI deploy public key.
2. **Scoped sudoers** (exact-match, no wildcards) — `/etc/sudoers.d/deploy`:
   ```
   deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart savdopro-backend, \
     /usr/bin/systemctl start savdopro-backend, /usr/bin/systemctl stop savdopro-backend, \
     /usr/bin/systemctl restart savdopro-license, /usr/bin/systemctl start savdopro-license, \
     /usr/bin/systemctl stop savdopro-license
   ```
3. **Symlink layout + one-time ExecStart edit** (both units):
   ```bash
   # backend
   mkdir -p /opt/barakat/releases/bootstrap
   mv /opt/barakat/barakat-market.jar /opt/barakat/releases/bootstrap/
   ln -sfn /opt/barakat/releases/bootstrap /opt/barakat/current
   # then: systemctl edit savdopro-backend → ExecStart ... -jar /opt/barakat/current/barakat-market.jar
   # license: same shape under /opt/savdopro with savdopro-license-server.jar
   systemctl daemon-reload
   ```
4. **`/etc/savdopro/deploy.env`** (root:deploy, 0640) for the backup gate +
   optional ping:
   ```
   PGUSER=savdopro
   PGPASSWORD=__DB_PASSWORD__
   PGDATABASE=savdopro
   BACKUP_DIR=/var/backups/savdopro
   RETENTION_DAYS=30
   # TELEGRAM_BOT_TOKEN=...   TELEGRAM_CHAT_ID=...
   ```
5. Ensure `pg_dump` is installed and `BACKUP_DIR` has disk headroom.

Until these are applied, run a **real dry-run** of `deploy.sh` on the box before
the pipeline's first live use (the local rehearsal already proves the rollback
logic).
