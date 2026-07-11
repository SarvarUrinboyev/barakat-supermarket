# OPS GATE — CI/CD Pipeline: Phase A (discovery + plan)

**Status: STOP — awaiting Sarvar approval.** Read-only. Touches only
`.github/workflows/` + `ops/` in Phase B; no app code.

A pipeline already exists (`ci.yml`, `deploy.yml`). This gate **hardens** it —
the deploy path today does an in-place jar swap with a jar-only backup and **no
DB dump, no automatic rollback, no releases dir**. Those are the real gaps.

---

## A1 — how prod runs today (evidence)

- **systemd**, two units: `savdopro-backend` + `savdopro-license`, plain
  `java -jar` (drop-ins `ops/systemd/savdopro-{backend,license}.service.d/10-hardening.conf.example`).
- Jars: `/opt/barakat/barakat-market.jar`, `/opt/savdopro/savdopro-license-server.jar`
  (`ExecStart=/usr/bin/java … -jar <path>`).
- **Frontend is bundled INTO the backend jar** (`backend/src/main/resources/static/`) —
  there is no separate bundle path to ship; jar+bundle are inherently one artifact.
- nginx sole ingress (443). Health: `127.0.0.1:8086/actuator/health` (backend),
  `127.0.0.1:9090/actuator/health` (license).
- Restart = `systemctl restart` — needs root/sudo. Current `deploy.yml` SSHes as
  `DEPLOY_USER` and calls `systemctl stop/start` directly (implies that user is
  root or has NOPASSWD sudo for those units).
- **Layout honesty (hard-rule §4):** the fixed-path in-place `mv` model can't do
  atomic swap or clean rollback. Minimal restructure proposed in B2: a
  `releases/<sha>/` dir + a `current` symlink the systemd `ExecStart` follows;
  rollback = repoint the symlink to the previous release + restart. This is a
  one-time change to ExecStart (`-jar /opt/barakat/current/barakat-market.jar`).
  **Needs SSH to apply the ExecStart change once** (list below).

## A2 — repo remote state

- Remote `origin` = `github.com/SarvarUrinboyev/savdopro`.
- **Gate C's 14 commits are LOCAL/unpushed** on `feat/saas-uplift-7-19`
  (`origin/feat/saas-uplift-7-19` is 14 behind). `main` = last merge is PR #5.
- **`main` protection: unknown from CLI** — check Settings → Branches (or
  `gh api repos/SarvarUrinboyev/savdopro/branches/main/protection`). Recommend:
  require PR + green CI before merge.
- Push policy (to document): feature branches push continuously (CI on every
  push); `main` = releases only (merge = the release trigger).

## A3 — health endpoint

- **Actuator present, no new endpoint needed.** `management.endpoints.web.exposure.include=health,info,prometheus`
  (`application.properties:235`, `application-prod.properties:84`); DB-aware,
  probes enabled, health public. A static `/api/health` also exists. Deploy
  health-checks hit `/actuator/health` (already used by the E2E job + deploy.yml).

## A4 — DB backup mechanics

- **`ops/backup-postgres.sh` already exists** and is exactly right: `pg_dump -Fc`
  (custom compressed), UTC-timestamped filename, writes `.partial` then renames,
  retention prune, libpq env vars (`PGUSER/PGPASSWORD/PGDATABASE`, `BACKUP_DIR`,
  `RETENTION_DAYS`). `deploy.sh` will invoke it as step 1.
- **Unknown until SSH:** target dir on the box, disk headroom, whether it runs on
  cron today. Restore cmd documented in the script header.

## A5 — frontend build-time env vars

- Code reads only **`VITE_MXIK_PROXY_URL`** (grep of `import.meta.env.VITE_`).
  Build/config also use `VITE_TARGET`, `VITE_LICENSE_URL`, `VITE_API_URL`.
- `deploy.yml` already injects `VITE_TARGET=web` + `VITE_LICENSE_URL` (from Actions
  var `LICENSE_URL`, with an old-host guard).
- **`VITE_MXIK_PROXY_URL` has NO injection point** — this is D0's finding. Phase B
  adds it as an Actions-variable slot in the build step (blank = off, as today),
  the home it gets wired into when D1 lands.

---

## What's needed once SSH returns (blocked items)
1. Confirm the deploy user + its sudo scope for `systemctl {start,stop,restart} savdopro-*`.
2. Apply the one-time ExecStart change to the `current` symlink (both units) + `daemon-reload`.
3. Confirm `BACKUP_DIR`, disk headroom, `pg_dump` present, DB creds for the dump.
4. Add the **dedicated CI deploy public key** (Prerequisite §5.1) to the deploy user.

---

## Phase B plan (on approval)

- **B1 `ci.yml`:** add a **frontend vitest** step (`npm test`) to the frontend job —
  currently only `npm run build` runs, so `format.test.js` + `customerBalance.test.js`
  aren't gated. (Everything else — backend/license/PG/e2e — already present.)
  Document the exact branch-protection toggles for Sarvar to click.
- **B2 `ops/deploy.sh`** (idempotent, server-side): (1) `backup-postgres.sh` DB dump
  FIRST; (2) stage jars to `releases/<sha>/`; (3) repoint `current` symlink +
  `systemctl restart`; (4) health-check both services w/ timeout (the `&&{ok=1;break;}`
  form, not the `set -e` false-fail trap already noted in deploy.yml); (5) on health
  fail → **auto-repoint symlink to previous release + restart + re-health + loud
  notify**; DB restore stays a human decision (never automatic).
- **B3 `deploy.yml`:** slim to build-jars + `scp releases/<sha>/` + run `deploy.sh`;
  keep `workflow_dispatch` trigger now (§1), `concurrency: deploy-prod`, upload the
  deploy log as an artifact, optional Telegram result ping. Add the
  `VITE_MXIK_PROXY_URL` build slot (A5).
- **B4 rollback rehearsal:** since prod SSH is blocked, rehearse `deploy.sh`'s
  rollback **locally** against a throwaway target (temp dirs as `/opt`, a fake
  "service" script whose health flips to failing on the new release) — drive it
  through `deploy.sh` and show the symlink auto-reverting to the previous release.
  A real prod dry-run follows once SSH returns. `shellcheck` clean.
- **B5 `ops/DEPLOY.md`:** normal flow, manual trigger, rollback behavior, secret
  rotation, the §1 dispatch→auto-push-main flip (one-line change).

## DECISIONS for Sarvar
- **D-1 — releases/symlink restructure:** OK to move to `/opt/barakat/current`
  symlink (needs the one-time ExecStart edit), vs. keep the fixed-path in-place
  swap and add only DB-dump + jar-`.bak` rollback (no ExecStart change, but
  rollback is a jar `cp` back, less clean)? **Recommend the symlink** — real
  rollback, atomic-ish, and the ExecStart edit rides the same SSH visit as §5.1.
- **D-2 — deploy privilege:** deploy as a dedicated `deploy` user with NOPASSWD
  sudo scoped to the three `systemctl` verbs on the two units (least-privilege,
  gate §4), vs. deploy as root? **Recommend the scoped deploy user.**

**STOP — awaiting approval + D-1/D-2 before Phase B.**
