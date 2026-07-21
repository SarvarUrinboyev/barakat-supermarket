# ProofTwin AI B5.0 Release Readiness

Evidence captured locally on 2026-07-18 and 2026-07-19 (Asia/Tashkent).
This document is a readiness map, not a deployment record. No push, deploy,
browser installation, service start, database connection, OpenAI request,
traffic change, or credential access was performed.

Status vocabulary:

- `VERIFIED`: directly proven in this worktree during B5.0.
- `DEFERRED`: intentionally outside this mission.
- `BLOCKED_NEEDS_APPROVAL`: technically prepared but requires explicit approval.
- `NOT_STARTED`: no execution evidence exists yet.

## B5.0 verdict

`B5_1_SAFE_TO_START=NO`.

The release artifact and deterministic backend are buildable, but the complete
browser journey is blocked by a product defect in supplier loading. The current
demo seed also lacks a tenant-owned supplier and a visible refund required by
the final journey. Live OpenAI and PostgreSQL runtime proof remain unexecuted.

## Precondition evidence

| Check | Status | Evidence |
|---|---|---|
| Repository root | `VERIFIED` | Canonical Windows path is `C:\Users\Laptop\Downloads\barakat-supermarket-build-week`. |
| Branch | `VERIFIED` | `feat/build-week-savdograph-ai`. |
| Starting HEAD | `VERIFIED` | `27f1c04c9a935bd0496fb4f814f3e950f99ac634`. |
| Clean precondition | `VERIFIED` | `git status --porcelain=v1 --untracked-files=all` returned zero entries before B5.0 changes. |
| Build Week ancestry | `VERIFIED` | `5568d92`, `84f92f9`, `af1abea`, `072be49`, `606a83e`, `e3a6984`, and `27f1c04` are all ancestors of starting HEAD. |
| Interrupted Git operation | `VERIFIED` | No merge, rebase, cherry-pick, revert, or bisect state was present. |
| Untracked secret-bearing file | `VERIFIED` | None existed; the complete porcelain result was empty. |
| Release/deploy operation | `VERIFIED` | No release or deployment process was in progress. |

## Release regression evidence

| Check | Exact command | Result | Time evidence |
|---|---|---|---|
| Frontend tests | `npm test -- --reporter=dot` | `VERIFIED`: 6 files, 104/104 tests, exit 0 | 2026-07-19 01:36:42 to 01:36:45, 2.604 s |
| Frontend build | `npm run build` | `VERIFIED`: 524 modules, exit 0 | 2026-07-18 23:50:21 to 23:50:33, 11.755 s |
| Frontend production audit | `npm audit --omit=dev` | `VERIFIED`: 0 vulnerabilities, exit 0 | 2026-07-18 23:50:40 to 23:50:42, 1.785 s |
| Focused backend | `.\mvnw.cmd '-Dtest=SavdoGraphProposalBridgeIT,SavdoGraphControllerIT' test` | `VERIFIED`: 17/17, exit 0 | 2026-07-18 23:50:51 to 23:51:24, 33.169 s |
| Full backend, first attempt | `.\mvnw.cmd test` | One timing-sensitive webhook failure: 376/377 passed, exit 1 | 2026-07-18 23:51:37 to 23:53:29, 111.581 s |
| Isolated failed test | `.\mvnw.cmd '-Dtest=ApiIntegrationFlowTest#webhookEnqueueAndDispatchMarksDelivered' test` | `VERIFIED`: 1/1, exit 0 | 2026-07-18 23:53:40 to 23:54:06, 26.046 s |
| Full backend, final attempt | `.\mvnw.cmd -q test` | `VERIFIED`: 377/377, zero failures/errors/skips, exit 0 | 2026-07-18 23:54:28 to 23:56:21, 113.033 s |
| Backend package | `.\mvnw.cmd -DskipTests package` | `VERIFIED`: exit 0 | 2026-07-18 23:56:30 to 23:56:38, 7.598 s |
| License server | Not run | `DEFERRED`: B3 through B4 changed no License Server permission model or files | Not applicable |

Warnings retained as release evidence:

- Vite reports the pre-existing 938.60 kB minified `ExportButton` chunk.
- H2 test contexts log non-fatal backup failures because an in-memory H2
  database cannot execute the configured backup operation.
- The first full backend run exposed a webhook timing failure even though the
  isolated test and the complete second run passed. Treat it as a flaky-test
  risk, not as proof that the first failure never happened.

## Artifact

| Item | Status | Value |
|---|---|---|
| Path | `VERIFIED` | `backend/target/barakat-market.jar` |
| Size | `VERIFIED` | 94,020,516 bytes |
| SHA-256 | `VERIFIED` | `30459E6AA37D451084F1083B8105972E5F68AA706CDC41C887F89ED1413E24AD` |
| Deployment | `NOT_STARTED` | The artifact was not copied or uploaded. |

Rebuild the artifact and recalculate its hash after any product, seed, frontend,
or documentation change that is included in a release candidate.

## Security checks

| Check | Status | Result |
|---|---|---|
| Live OpenAI token signature in tracked files | `VERIFIED` | 0 matching paths |
| Private-key material in tracked files | `VERIFIED` | 0 matching paths |
| Embedded PostgreSQL URI/JDBC credential | `VERIFIED` | 0 matching paths |
| Provider internals in production frontend bundle | `VERIFIED` | 0 matching paths |
| Unsafe provider/credential runtime markers in frontend source | `VERIFIED` | Production source: 0; two test-only assertions mention redaction concepts |
| Tracked sensitive filenames | `VERIFIED` | Four `.env.example` templates only; no real `.env`, key, keystore, or certificate file |
| Raw provider payload / hidden reasoning in UI | `VERIFIED` | No runtime renderer; tests explicitly reject these fields |

The scans are high-confidence signature checks of the current tree, not a full
historical-secret audit of every Git object.

## Browser runtime discovery

| Item | Status | Evidence |
|---|---|---|
| Google Chrome | `VERIFIED` | Installed at `C:\Program Files\Google\Chrome\Application\chrome.exe`, version `150.0.7871.125` |
| Edge | `VERIFIED` | Not found at the inspected Program Files, x86, or local paths |
| Chromium | `VERIFIED` | Not found at the inspected local path |
| Playwright browser cache | `VERIFIED` | Absent |
| Playwright | `VERIFIED` | Repository package version 1.61.1 |
| Browser install | `VERIFIED` | No browser was installed or downloaded |

The test-only Playwright configuration now supports:

```powershell
$env:E2E_SAVDOGRAPH_MOCK = '1'
$env:E2E_BROWSER_CHANNEL = 'chrome'
.\node_modules\.bin\playwright.cmd test e2e/savdograph.mock.spec.js
```

It starts a loopback-only Vite process managed by Playwright, forces
`VITE_DEMO_DATA=true`, uses the existing Chrome channel, and never connects to
production. The mock route was narrowed so Vite modules under `src/api` are not
mistaken for JSON API calls.

### Browser verification result

`BROWSER_VERIFICATION=BLOCKED_PRODUCT_DEFECT`.

The browser loaded the route and completed the Gross Profit Brief, Uzbek Ask,
Evidence Viewer keyboard close/focus return, product search, and reorder
simulation. It could not complete supplier selection, proposal creation,
approval/rejection, or Action Ledger verification because the supplier select
remained disabled.

Root cause is the supplier-loading effect in `frontend/src/pages/SavdoGraph.jsx`:
it sets `supplierLoading=true` while also depending on `supplierLoading`. The
rerender runs the effect cleanup, changes its `current` guard to false, and the
promise completion can no longer clear loading or publish suppliers. Product
code was not changed in B5.0.

No pass screenshots were captured. Playwright failure artifacts are local,
ignored diagnostics and are not submission evidence.

Required viewport assertions are encoded for `1440x900`, `1024x768`,
`768x1024`, and `390x844`, including Demo label, horizontal overflow, console,
page errors, and screenshots after all assertions. They remain unverified until
the product defect is fixed and the entire journey passes.

## OpenAI live-smoke readiness

Environment presence was checked without reading or printing values:

| Variable | Presence |
|---|---|
| `OPENAI_API_KEY` | `ABSENT` |
| `OPENAI_MODEL` | `ABSENT` |
| `OPENAI_REASONING_EFFORT` | `ABSENT` |
| `OPENAI_MAX_OUTPUT_TOKENS` | `ABSENT` |
| `OPENAI_TIMEOUT_SECONDS` | `ABSENT` |

Source-verified contract:

- Endpoint: authenticated `POST /api/savdograph/ask`.
- Provider target: OpenAI Responses API, server-side only.
- Default model: `gpt-5.6-terra`.
- Allowed override: `gpt-5.6-terra` or `gpt-5.6-sol`; invalid values fall back
  to `gpt-5.6-terra`.
- Default reasoning effort: `medium`; allow-list is `none`, `minimal`, `low`,
  `medium`, `high`, `xhigh`, `max`.
- Default timeout: 30 seconds, clamped to 1 through 120 seconds.
- Default output limit: 1200 tokens, clamped to 256 through 4000.
- Maximum sequential tool calls: 5; parallel tool calls are rejected.
- `store=false`, strict tool schemas, strict structured output, and
  `parallel_tool_calls=false` are explicit.
- Safety identifier is a stable server-side HMAC alias of the authenticated
  internal numeric user ID. It is not exposed to the client.
- Expected safe success: typed, classified UZ/RU/EN answer whose business
  numbers cite server evidence; no direct write or purchase action.
- Expected audit: start, provider/tool selection/execution, groundedness, and
  completion/failure events with minimized metadata and evidence references.

An anonymized smoke request should use the reserved demo tenant and the exact
question `Bugungi yalpi foyda qancha?`, with a short approved period. The result
must be `ANSWERED`, cite immutable evidence, contain no unsupported number, and
produce the expected audit chain. Do not log or persist raw provider bodies.

`LIVE_OPENAI_SMOKE_READY=NO`.

Safe preparation: place the key only in the isolated demo server environment,
set an allowed model/configuration there, obtain explicit cost-bearing smoke
approval, run one bounded request, inspect the minimized audit record, then
remove or retain the secret according to the approved server secret process.
Never send the key through chat or commit it.

## PostgreSQL readiness

| Item | Status | Evidence |
|---|---|---|
| Docker CLI | `VERIFIED` | Version 29.6.1 installed |
| Docker engine | `DEFERRED` | Unreachable; it was not started |
| PostgreSQL binaries | `VERIFIED` | PostgreSQL 18 `initdb`, `postgres`, `pg_ctl`, `psql`, `createdb`, `dropdb`, and `pg_isready` are installed |
| Windows service | `VERIFIED` | `postgresql-x64-18`, Manual, Stopped; it was not started |
| Local listener | `VERIFIED` | No listener on 5432, 5433, or 55432 |
| Flyway chain | `VERIFIED` | SQL V1-V43 and V46 plus Java V44 and V45 are present; numeric gaps V15/V22 are historical and documented by the repository |
| V44 contract | `VERIFIED` source-only | Append-only evidence/decision/ledger triggers, tenant-scope triggers, and enum/value checks |
| V46 contract | `VERIFIED` source-only | Unique `(shop_id, analysis_run_id, source_kind)` bridge key |
| Runtime parity | `NOT_STARTED` | H2 evidence is not PostgreSQL parity |

Safest available method is Option B, but not the existing Windows service
cluster. Use the installed PostgreSQL binaries to create an independent,
short-lived cluster under a validated `C:\tmp\savdograph-b5-pg` directory on
loopback port 55432. This avoids Docker, the stopped service, and every existing
application database.

Approval-gated outline:

1. Verify the absolute temporary target and port are unused.
2. Generate a random password in process memory; write it to a temporary
   password file with user-only ACL.
3. Run `initdb` for the temporary data directory with SCRAM authentication.
4. Run that cluster with `pg_ctl` bound to `127.0.0.1:55432`.
5. Create a database and role named only for `savdograph_b5_parity`.
6. Point a single `ApplicationContextSmokeTest` process at it so Flyway applies
   V1 through V46.
7. Inspect `flyway_schema_history`, all `trg_sg_*` trigger definitions, V44
   constraints, V45 provenance column, and V46 unique constraint.
8. Insert only minimal synthetic tenant/product/run/evidence/proposal rows and
   prove forbidden evidence/decision/ledger update/delete and duplicate bridge
   insertion fail with the expected PostgreSQL errors.
9. Stop the temporary cluster with `pg_ctl -m fast stop`.
10. Remove only the validated temporary directory and clear all task-specific
    environment variables.

Creation, use, and cleanup all require explicit approval because they start a
database runtime and create/delete database files.

`POSTGRES_PARITY_READY=YES` was the B5.0 pre-authorization finding. B5.2A later
executed that isolated method and supersedes the earlier pending state with
`POSTGRES_PARITY=VERIFIED`.

## Isolated demo topology

Repository support is `PARTIAL` without product changes. Dockerfiles, Compose,
systemd/Nginx examples, environment templates, health endpoints, guarded demo
seeds, and a permanent `VITE_DEMO_DATA` banner already exist. The exact final
journey still needs the supplier-loading defect fixed and a narrow seed-only
artifact for the missing refund/supplier/review records.

Recommended topology:

- a separate demo application container or systemd unit;
- a separate demo License Server instance;
- a separate PostgreSQL server/database/role with no production route;
- a separate environment file readable only by the service account;
- reserved anonymized demo tenants and judge-only owner account;
- HTTPS on a distinct demo hostname and Nginx upstream;
- permanent Demo Data banner baked with `VITE_DEMO_DATA=true`;
- CPU/memory limits, structured logs without request/provider bodies, and
  server-side-only OpenAI configuration;
- rollback by stopping the demo unit/container and restoring the previous
  artifact/database snapshot; never roll back production.

### Thirteen-step deployment plan

| Step | Status | Plan |
|---|---|---|
| 1. Artifact | `VERIFIED` local only | Rebuild the JAR from the final approved commit. |
| 2. Artifact hash | `VERIFIED` current candidate | Recalculate SHA-256 after final build and compare after transfer. |
| 3. Environment checklist | `DEFERRED` | Separate profile, bind address, datasource URL/user/password, JWT secret, demo-seed guard/password, allowed origins, proxy headers/CIDRs, metrics token, OpenAI variables, SMTP/payment/provider features disabled unless separately approved. No values in docs. |
| 4. Database creation | `BLOCKED_NEEDS_APPROVAL` | New demo DB/role only; deny production network access. |
| 5. Migration | `BLOCKED_NEEDS_APPROVAL` | Flyway V1-V46 on empty demo DB; record history and V44/V46 inspection. |
| 6. Seed | `DEFERRED` | Apply deterministic anonymized B5 seed after seed gaps are implemented and tested. |
| 7. Service | `BLOCKED_NEEDS_APPROVAL` | Separate unit/container, non-root user, resource limits, secret env file. |
| 8. Nginx | `BLOCKED_NEEDS_APPROVAL` | Separate HTTPS hostname and upstream; no production route replacement. |
| 9. Health checks | `DEFERRED` | Local actuator health, authenticated route, license auth, static chunk, then public HTTPS. |
| 10. Rollback | `DEFERRED` | Preserve previous demo artifact and DB snapshot; stop only demo resources. |
| 11. Judge account | `BLOCKED_NEEDS_APPROVAL` | Dedicated ACCOUNT_OWNER in reserved demo tenant; generated credential delivered out of band. |
| 12. Smoke test | `DEFERRED` | Full browser journey, one approved live OpenAI request if authorized, tenant isolation, no operational side effect. |
| 13. Evidence capture | `NOT_STARTED` | Capture only after all relevant gates pass; redact URL tokens and credentials. |

## Demo data readiness

The guarded `DemoDataSeeder` is idempotent, disabled for `prod` and `test`, and
uses reserved accounts 90001/90002. It creates shops, products with historical
cost, sales, customer ledgers, expenses, and tenant-isolation data through real
services. `DemoUserSeeder` creates demo owners/cashier only when the guard and a
strong server-side seed password are configured.

Final-journey gap analysis:

| Requirement | Status |
|---|---|
| Gross Profit Brief with valid cost | `VERIFIED` seed capability |
| Visible refund | `DEFERRED`: missing from current demo seed |
| ESTIMATED reorder simulation | `VERIFIED` data capability; final seeded scenario still needs explicit proof |
| Two product-search candidates | `VERIFIED` |
| Tenant-owned supplier | `DEFERRED`: missing from current demo seed |
| Proposal bridge | `DEFERRED`: blocked by missing supplier and UI defect |
| Owner approval creates one DRAFT | `VERIFIED` backend contract; demo journey unverified |
| Rejection flow | `VERIFIED` backend contract; demo journey unverified |
| Immutable ledger | `VERIFIED` application/static contract; PostgreSQL runtime proof pending |
| UZ/RU/EN interaction | `VERIFIED` fake-provider tests; live demo needs approved provider smoke |

A narrow B5 seed-only artifact is required. It should add a contact-free
`Demo Supplier`, two similarly named demo products, a completed sale plus
refund with valid cost provenance, deterministic reorder history, and explicit
review records only in the reserved demo tenant. It must never import or copy
production data.

## Judge account plan

1. Create a dedicated ACCOUNT_OWNER only in the isolated demo License Server.
2. Bind it to reserved demo account 90001 and the intended demo shop.
3. Grant only the committed `SAVDOGRAPH:*` and ledger-read permission model.
4. Generate a strong password server-side; deliver it out of band, never in Git,
   logs, screenshots, video, or this document.
5. Disable self-service mutation outside the planned demo and set an expiry.
6. Test login, shop scope, direct-route denial for a non-owner, and logout.
7. Revoke/delete the judge account after the submission window.

## Git and submission readiness

| Item | Status | Evidence / action |
|---|---|---|
| Remote | `VERIFIED` | One remote named `origin`, sanitized host `github.com` |
| Build Week branch upstream | `DEFERRED` | No upstream configured; no network fetch was performed |
| Build Week history | `VERIFIED` | Baseline through B4 is linear and complete |
| Tags | `VERIFIED` | Existing release tags are present; no Build Week release tag was created |
| Public/private submission repo | `NOT_STARTED` | No plan is recorded in the repository |
| README | `VERIFIED` | The ProofTwin AI Build Week section is present. |
| Judge access | `BLOCKED_NEEDS_APPROVAL` | Decide public repo or private judge invitation before push/submission |
| Push/PR | `NOT_STARTED` | No push or PR was performed |

Starting release baseline remains `27f1c04c9a935bd0496fb4f814f3e950f99ac634`.
B5.0 is intentionally uncommitted while the complete browser gate is blocked.
After an approved B5.1 fix, seed completion, and clean green validation, the
release commit must be the exact tested descendant, not the old baseline.

## Approval map

| Gate | Action | Risk | Required user approval | Current readiness |
|---|---|---|---|---|
| Existing browser | Run installed Chrome against loopback mocks | Local process and test artifacts | Already authorized by B5.0 | Executed; blocked by product defect |
| Browser install | Install Playwright Chromium | Machine change/download | Explicit install approval | Not needed; Chrome exists |
| Live OpenAI | One bounded demo request | Credential use and cost | Explicit credential-use/cost approval | `LIVE_OPENAI_SMOKE_READY=NO` |
| PostgreSQL runtime | Start isolated temporary cluster | Local runtime/files | Explicit runtime approval | B5.2A executed, verified, stopped, and removed |
| Isolated demo DB | Create role/database | Data/state creation | Explicit database approval | Planned only |
| Push branch | Publish exact tested descendant | External Git state | Explicit push approval | No upstream; not started |
| Deploy demo | Transfer/start demo artifact | Server state/cost | Explicit deploy approval | Planned only |
| Demo migrations | Run Flyway V1-V46 | Database schema mutation | Explicit migration approval | Planned only |
| Demo account | Create judge owner | Credential/account state | Explicit account approval | Planned only |
| Nginx/DNS/traffic | Add HTTPS demo route | Public traffic/config | Explicit traffic approval | Planned only |
| Video upload | Upload public/unlisted video | External publication | Explicit upload approval | Assets not started |
| Devpost submission | Final submission | Public irreversible publication | Explicit final-submit approval | Not ready |

## Required next approvals and blockers

Before B5.1 can be called safe:

1. Approve a narrow product fix for the supplier-loading effect and regression
   test coverage.
2. Approve a narrow deterministic seed-only artifact for the missing refund and
   tenant-owned supplier.
3. Re-run and pass the complete mocked Chrome journey at all four viewports.
4. Isolated local PostgreSQL runtime proof completed under B5.2A approval.
5. Keep the live OpenAI smoke, push, deploy, migrations, account, traffic,
   upload, and final submission behind their separate approvals.

No approval should be interpreted as approval for any other gate.

## B5.1 retry final local result - 2026-07-19

This section supersedes the earlier B5.0 browser-blocker verdict while retaining
that evidence as history. Starting committed baseline remained
`27f1c04c9a935bd0496fb4f814f3e950f99ac634` on
`feat/build-week-savdograph-ai`; all expected B5.0/B5.1 changes were preserved.

### Overflow diagnosis and narrow fix

Chrome 150.0.7871.125 reproduced the 390x844 defect before the fix:
`documentElement=390/643` and `body=390/643` (client/scroll widths).
Direct topbar widths were menu 24 px, breadcrumb 171.45 px, shop switcher
186.61 px, and right controls 228.63 px. The non-wrapping global topbar row,
non-shrinking shop pill, and right action row jointly extended the page.

Only `frontend/src/styles/index.css`, the focused responsive browser test, and
the existing mocked-journey test were changed for the retry. At <=900 px the
identity can shrink, the date yields, gaps tighten, and the shop name is
ellipsis-constrained. At <=720 px the same controls use a two-row grid with
44 px mobile targets. No `overflow-x: hidden`, user-agent branch, control
removal, new shell, or client-side tenant authority was added.

### Final geometry

| Viewport | clientWidth | document scrollWidth | body scrollWidth | Console/page errors | Result |
|---|---:|---:|---:|---:|---|
| 1440x900 | 1440 | 1440 | 1440 | 0 / 0 | VERIFIED |
| 1024x768 | 1024 | 1024 | 1024 | 0 / 0 | VERIFIED |
| 768x1024 | 768 | 768 | 768 | 0 / 0 | VERIFIED |
| 390x844 | 390 | 390 | 390 | 0 / 0 | VERIFIED |

The focused long-shop-name geometry test also proved keyboard operation,
accessible names, sidebar open/Escape close, UZ/RU language control, theme
toggle, bounded resize events, and ProofTwin content containment.

### Fresh validation

| Gate | Final result |
|---|---|
| Focused responsive Chrome | 1/1 passed at all four viewports |
| Complete mocked Chrome journey | 5/5 passed: four independent full journeys plus gated capture |
| Focused ProofTwin Vitest | 99/99 passed |
| Full frontend Vitest | 112/112 passed |
| Frontend build | 525 modules, exit 0 |
| Frontend production audit | 0 vulnerabilities |
| Demo seed guard/integration | 6/6 passed |
| Affected B1/B2/B3/B3.5 | 68/68 passed |
| Full backend | 377/377, zero failures/errors/skips |
| Backend package | exit 0; 94,778,762-byte JAR; SHA-256 `2dc2bd3c395381cecb00a89f6c2244b2f348c7c94a40cbc4a1b2523193ea652d` |
| Source/bundle/changed-file scans | 0 matching files; 0 sensitive filenames |
| `git diff --check` | exit 0 |

The known H2 in-memory backup-startup warning remained non-fatal and is not
PostgreSQL proof. Screenshots were created only after the four full browser
journeys passed, under `docs/build-week/screenshots/b5.1/`.

Current external gates remain `LIVE_OPENAI_SMOKE=DEFERRED`, push, demo deploy,
demo-database creation/migration, judge account, public traffic, upload, and
submission. The B5.1 validated local commit gate remains green.

## B5.2A isolated PostgreSQL parity - 2026-07-19

The approved proof used the already installed PostgreSQL 18.1 binaries in
`C:\Program Files\PostgreSQL\18\bin`. It created a uniquely named cluster only
under `C:\tmp\savdograph-b52a-<unique-id>`, listened only on
`127.0.0.1:55432`, used UTF-8, `Asia/Tashkent`, data checksums, unique random
role/database names, and process-only random credentials. The stopped
`postgresql-x64-18` Windows service was inspected read-only and remained
Manual/Stopped.

Windows `initdb` does not accept `--pwfile=-`. The empty cluster therefore used
localhost-only trust solely for bootstrap; before creating application data,
the process-only password was assigned with SCRAM, `pg_hba.conf` was changed to
`scram-sha-256`, and the cluster was reloaded. No credential was written to the
repository, command output, release evidence, or final documentation.

Sanitized runtime sequence:

```powershell
& '<pg18-bin>\initdb.exe' -D '<unique-temp-data>' --encoding=UTF8 --locale=C --data-checksums
& '<pg18-bin>\pg_ctl.exe' -D '<unique-temp-data>' -l '<temp-log>' -o '...127.0.0.1...55432...' start
& '<pg18-bin>\pg_isready.exe' -h 127.0.0.1 -p 55432
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://127.0.0.1:55432/<random-db>'
Set-Location .\backend
.\mvnw.cmd -o -B --no-transfer-progress '-Dtest=ApplicationContextSmokeTest' test
& '<pg18-bin>\psql.exe' -h 127.0.0.1 -p 55432 -d '<random-db>' '<sanitized-proof-sql>'
& '<pg18-bin>\pg_ctl.exe' -D '<unique-temp-data>' stop -m fast
```

### Migration, schema, and database inspection

- Flyway validated and applied all 46 migrations, V1 through V46, on a fresh
  PostgreSQL database; history contained 46 successful rows, no gaps, skips, or
  checksum mismatch, and final version `46`.
- `ApplicationContextSmokeTest` used an actual
  `org.postgresql.jdbc.PgConnection`; Flyway completed and Hibernate schema
  validation passed. No H2 URL appeared in this parity process.
- All six SavdoGraph tables, foreign keys, check/unique constraints, and indexes
  were present. V46 installed `ck_sg_proposal_source_kind` and database-backed
  `uq_sg_proposal_bridge_source`.
- Seven relevant non-internal triggers existed and were enabled:
  `trg_sg_evidence_append_only`, `trg_sg_decision_append_only`,
  `trg_sg_ledger_append_only`, `trg_sg_evidence_scope`,
  `trg_sg_proposal_scope`, `trg_sg_proposal_evidence_scope`, and
  `trg_sg_decision_scope`.
- PostgreSQL types/values were exercised as `timestamp without time zone`,
  `numeric` scale 4, JSON stored as text and cast back to `jsonb`, and canonical
  `reorder`/`B1_CANONICAL_V1` provenance.

### Runtime behavior proof

- Legitimate evidence, decision, and ledger inserts succeeded. UPDATE and
  DELETE were each rejected for all three append-only tables: six deterministic
  failures, with original row fingerprints unchanged.
- The first V46 `(shop, run, source kind)` proposal succeeded. Equivalent and
  conflicting-supplier duplicates both failed on
  `uq_sg_proposal_bridge_source`; the database retained one proposal.
- A duplicate inside a proposal-plus-ledger transaction rolled back both rows,
  leaving proposal/ledger counts `0/0` for that transaction.
- Four cross-tenant reference attempts were rejected by PostgreSQL scope
  triggers and left zero rejected rows: run/evidence, supplier/proposal,
  evidence/proposal, and proposal/decision mismatches.
- An application-service harness against the same PostgreSQL cluster proved one
  decision, one `DRAFT`, replay to the same DRAFT, zero `ORDERED`/`RECEIVED`,
  unchanged inventory, zero supplier notification, and cross-tenant proposal
  invisibility.

### Regression and cleanup

The PostgreSQL context test passed `1/1`. The application-service harness
reported `decision=1`, `draft=1`, `replay=1`, inventory unchanged, and no
operational side effects. The normal H2-backed affected suite separately passed
`68/68`; the full backend suite passed `377/377`; packaging produced a
94,778,762-byte JAR with SHA-256
`2dc2bd3c395381cecb00a89f6c2244b2f348c7c94a40cbc4a1b2523193ea652d`.
H2 results are not counted as PostgreSQL proof.

The exact temporary cluster was stopped with fast shutdown, its listener was
verified closed, and its validated unique directory was removed. Process-only
datasource/password variables were cleared. No remote or production database,
Docker engine, OpenAI provider, Windows service control, deployment, push, or
public system was contacted. Flyway warned that PostgreSQL 18.1 is newer than
its tested PostgreSQL 16 ceiling; the warning is retained as a tooling
limitation, while migration and runtime behavior passed on actual PostgreSQL
18.1.

## B5.2C offline groundedness diagnosis - 2026-07-19

The single previously authorized B5.2B interaction used the exact Uzbek
question `Bugungi yalpi foyda qancha va bu raqam qaysi dalillarga asoslangan?`,
`gpt-5.6-terra`, two provider exchanges, and
`get_daily_gross_profit_brief`. Language and schema validation passed, but the
public result was `GROUNDEDNESS_VALIDATION_FAILED`. No financial result was
accepted, no side effect occurred, and no raw provider body or validator
subreason was retained.

The exact cause of that historical provider draft is
`G. INSUFFICIENT_EVIDENCE_TO_DETERMINE`: the raw draft and its rejection
subreason do not exist, and several independent fail-closed branches map to the
same public status. This is not relabeled as a live pass.

Offline review nevertheless proved and remediated bounded validator and
serialization defects plus one schema gap:

- cited monetary facts were value-checked but their unit/currency was not
  compared with the cited tool evidence;
- exact structured metadata tokens such as `B2.0` and a disclosed immutable
  evidence ID could be parsed as unsupported business numbers;
- the Gross Profit tool omitted the calculation version from its safe serialized
  result;
- fact evidence arrays allowed zero items, and an `ANSWERED` result with no
  facts and no top-level evidence could pass the prior validator.

The remediation adds a typed safe reason, fixed field path and evidence-reference
count; interaction-scoped unit metadata; exact-token metadata handling; safe
calculation-version serialization; `minItems: 1` for fact evidence; and a
fail-closed empty-answer-evidence check. Ordinary users still receive only the
generic groundedness failure. No raw answer, provider payload, hidden reasoning,
credential, tenant ID, or authorization value is stored in the diagnostic.

The 20-case fake-provider matrix passed. Semantically equal decimal/grouping,
UZS/Uzbek currency, percentage, date, and numeric-JSON-to-string forms pass;
different values/currencies, shorthand scaling, empty/missing/previous/
cross-tenant/unrelated evidence, unsupported narrative numbers, evidence
counts, modified IDs, classification upgrades, Net Profit relabeling, and
pre-tool evidence collection fail with exact safe reasons. The exact live-shaped
Uzbek fake-provider path passed in two exchanges.

Fresh offline gates: focused B3 `38/38`; affected B1/B2/B3/B3.5 `80/80`;
full backend `389/389`, zero failures/errors/skips; package exit 0.
`barakat-market.jar` is 94,784,550 bytes with SHA-256
`74d0d655893856c6977ac2546a81239c14186553234cf6c5198986e6781c1a76`.
Changed-file secret scanning and final Git checks are recorded at commit gate.

No network request was made in B5.2C. `OPENAI_API_KEY` was handled as
presence-only and never read or used. `POSTGRES_PARITY=VERIFIED` remains
unchanged. One further live attempt is justified only as a separately approved,
single bounded retry that captures the new safe enum; it is not authorized here.

## B5.2D bounded live OpenAI retry - 2026-07-19

After explicit credential-use, network, and cost approval, exactly one
anonymized synthetic interaction asked
`Bugungi yalpi foyda qancha va bu raqam qaysi dalillarga asoslangan?`.
The committed `SAVDOGRAPH_COPILOT_V1` server path used `store=false`, strict
tools and structured output, `parallel_tool_calls=false`,
`gpt-5.6-terra`, medium reasoning, 1,200 maximum output tokens, and a
30-second per-exchange timeout.

The bounded result was `ANSWERED / VERIFIED / uz` after exactly two provider
exchanges. The actual returned model was `gpt-5.6-terra`; the only executed
tool was `get_daily_gross_profit_brief`; eight immutable evidence references
were from the current synthetic interaction. Numeric, tenant-scope,
currency/unit, classification, Gross-vs-Net terminology, and unsupported
narrative-number gates all passed.

Provider latency was 7,345 ms and bounded wall latency was 10,257 ms. No raw
provider body, complete answer, hidden reasoning, key information, tenant
identifier, authorization value, personal/contact data, or production record
was recorded. No approval, PurchaseOrder, supplier, payment, receiving,
delivery, inventory, or price operation occurred. No safe failure enum was
needed. `POSTGRES_PARITY=VERIFIED` remains separate and unchanged.
`LIVE_OPENAI_RETRY=VERIFIED`; push, CI, deploy, public traffic, feedback,
upload, and submission remain separate approval gates.

## B5.3D same-origin License gateway and Railway runtime preparation - 2026-07-19

- The bundled SPA has one License access path: same-origin `/api/license` on the
  public backend. The browser has no License Server hostname or Railway-private
  DNS value.
- The backend maps only frontend-proven routes to the private License Server.
  It rejects arbitrary routes/hosts/queries, strips hostile and hop-by-hop
  headers, forwards only an existing bearer token, bounds bodies, rejects
  redirects, and returns safe errors without internal hostname disclosure.
- Backend `PORT` defaults to 8086 and preserves its local bind default; the
  Railway contract supplies `SERVER_ADDRESS=0.0.0.0`. License Server `PORT`
  defaults to 9090 with its private-service bind. Health paths remain
  `/actuator/health` and `/api/health`.
- License H2 remains separate from backend PostgreSQL/Flyway and is documented
  for a private `/data` Railway volume. The variable matrix, manual deployment
  plan, and rollback plan contain no values for secrets.
- Local validation passed: gateway 6/6; backend 395/395; License 157/157;
  frontend 116/116; build/audit/Docker; and built-SPA synthetic staging E2E 3/3.
  No Railway, production, OpenAI, deployment, payment, inventory, supplier, or
  price action occurred.

Remaining external gates are manual Railway resource/variable creation,
private-network verification, demo deploy health validation, a fresh CI-backed
commit/push approval, judge-account review, public traffic decision, video, and
submission. No demo URL is claimed.
