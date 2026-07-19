# SavdoGraph AI — Codex Collaboration Contract

## Purpose

This repository already contains SavdoPRO/Barakat work. Codex may help build a
new SavdoGraph AI submission only when the provenance, scope, safety constraints
and validation evidence remain auditable.

This contract applies to every later implementation task on
`feat/build-week-savdograph-ai`.

## Baseline and branch discipline

- The audit baseline is `bffc4326fdbb95e9f9e620759d5897848c451cb8`, dated
  2026-07-12, before the Build Week cutoff of 2026-07-13.
- The original checkout was dirty at audit start. Its 21 tracked modifications
  and untracked scanner report are not Build Week work and must not be altered,
  staged, or credited without separate provenance.
- Documentation work is isolated in a clean linked worktree on
  `feat/build-week-savdograph-ai`. Feature work must start from this branch or a
  reviewed descendant, not from the dirty checkout.
- Never reset, rebase, amend, squash, force-push, rewrite history, or delete
  files/data as part of Build Week work.
- Do not push, deploy, tag a release, modify production infrastructure, modify a
  production database, spend money, or use credentials without explicit user
  approval and a separate verification gate.

## Product boundary

Only these experiences are in scope:

1. Daily Profit Brief
2. Ask Your Store through deterministic retail tools
3. Evidence Card
4. Reorder-only Decision Simulator
5. Human Approval
6. Action Ledger

The scope exclusions in `BUILD_WEEK_SCOPE.md` are binding. In particular, a
generic chatbot, direct AI purchase/order action, broad ERP work, payment flow,
and production/demo-data changes are out of scope.

## Roles and responsibilities

| Role | Responsibility | Evidence required before declaring done |
|---|---|---|
| Principal architect | Keep contracts small, tenant-scoped and compatible with existing POS/forecast/PO boundaries. | File-level design, migration/API contract and non-goal check. |
| Product engineer | Implement the thin end-to-end owner journey, accessible/responsive UI and clear demo labeling. | Focused UI/component tests and seeded-demo screenshots or Playwright evidence. |
| Security reviewer | Enforce per-tool permissions, tenant scope, provider minimization, immutable approval state and no-spend path. | Negative authorization/tenant tests and data-flow review. |
| Release engineer | Run the configured local/CI-safe checks, record exact versions/results, and keep deployment separate. | Command log, exit code, blocker evidence and no deployment claim. |
| Compliance auditor | Preserve the pre-existing/Build Week distinction and ensure public demo materials make no unsupported claim. | Changelog, provenance table, demo script and evidence references. |

## Working rules

### Evidence first

- Read actual source, migrations, tests and configuration before asserting a
  capability exists.
- Classify every reviewed feature as implemented-and-verified,
  implemented-not-verified, partial, mock-only, documented-only, absent or
  blocked. Do not turn a documentation statement into a code claim.
- Every new recommendation must have a stored source period, calculation/version,
  input snapshot/hash, assumptions, confidence, expected benefit and risk.
- Every numeric model answer must point to an evidence ID. If no deterministic
  evidence exists, return a safe unsupported/insufficient-data response.

### Safety first

- Never read, print, copy, commit, or paste credentials, production data, customer
  data, supplier contacts, private keys or raw operational snapshots.
- Do not send PII/contact fields to an external provider. Provider requests are
  limited to minimal, structured retail aggregates and require an explicit owner
  policy/consent boundary.
- Preserve the existing tenant filter and direct-ID safeguards. New records must
  be tenant/shop scoped and tests must cover A/B isolation.
- Map every AI tool to a least-privilege server-side permission. `REPORTS:READ`
  alone must not grant supplier or expense data through an AI path.
- Approval is server-side and owner-only. A proposal can create an idempotent PO
  `DRAFT` or task only; it cannot order, receive, pay, notify suppliers or invoke
  a legacy direct `ORDER` action.

### Scope and quality first

- Prefer a narrow deterministic slice over a broad, unproven AI surface.
- Do not conceal existing transfer, discount/refund, currency, expiry or
  slow-mover limitations. Present them as assumptions/risks in Evidence Cards.
- Avoid unrelated cleanup, dependency churn and architecture redesign.
- Add regression tests with each bug fix and new workflow. Do not rely on a
  model response as test evidence.

## Required execution sequence

1. **Preflight** — confirm clean branch/worktree, baseline commit, active JDK,
   Node and Docker state; record existing user changes separately.
2. **Contract gate** — write typed Evidence/Proposal/Ledger contracts, migration
   plan and endpoint permission matrix before UI work.
3. **Security gate** — implement/verify tool permission mapping, numeric-evidence
   enforcement, provider redaction and tenant checks.
4. **Deterministic gate** — implement daily P&L aggregation and reorder simulator
   using declared inputs and golden tests.
5. **Human gate** — implement proposal/approval/rejection state and draft-only
   action creation with idempotency.
6. **Experience gate** — implement brief, question/evidence rendering, simulator
   and ledger; label demo/sample data permanently in the UI.
7. **Validation gate** — run focused tests, full available test/build suite,
   secret/dependency checks and Docker E2E when the daemon is available.
8. **Demo gate** — rehearse the five-minute script with seeded data and capture
   evidence. Do not deploy as part of this gate.

Each gate must stop on a material failure. The appropriate response is to record
the blocker, narrow the scope, or request a user decision—not to mock a success.

## Decisions that require user authority

Ask before any of the following:

- creating/configuring an external OpenAI or other AI provider account/key,
  payment/merchant setting, customer/supplier data transfer, or paid resource;
- sending code/data to a public repository, pushing a branch, opening a PR, or
  publishing a demo;
- deploying/restarting production, changing public ingress, or running a real
  database migration;
- choosing a materially broader product scope or accepting a known data-integrity
  limitation as production-ready.

## Definition of done for an implementation increment

An increment is done only when its source, migration and test changes are on the
Build Week branch; all relevant checks have exact results; the tenant/permission
and no-spend constraints have negative tests; the evidence card shows its source
and limitations; and the changelog clearly marks it as new Build Week work.

## B1 implemented backend contract

`V42__savdograph_foundation.sql` introduces the B1 persistence boundary. Every
new primary record carries `shop_id`, uses the existing Hibernate tenant filters
and `TenantScopedEntity` direct-ID guard, and is reached only through the active
request scope. The recorded server role is the existing `ACCOUNT_OWNER` role;
`SUPER_ADMIN` and `SHOP_USER` are not treated as a substitute owner for a
SavdoGraph decision.

| Endpoint | Permission | B1 behavior |
|---|---|---|
| `POST /api/savdograph/analysis-runs` | `SAVDOGRAPH:WRITE` | Records `REORDER_LOW_STOCK` period/input/version metadata. |
| `GET /api/savdograph/analysis-runs/**`, `GET /api/savdograph/evidence-items/**`, `GET /api/savdograph/proposals/**` | `SAVDOGRAPH:READ` | Returns only active-shop data. |
| `POST /api/savdograph/evidence-items/reorder-quantity` | `SAVDOGRAPH:WRITE` | Calculates the low-stock-gap quantity on the server and stores immutable evidence. |
| `POST /api/savdograph/proposals` | `SAVDOGRAPH:WRITE` | Requires the immutable server calculation and derives product/quantity from it. |
| `POST /api/savdograph/proposals/{id}/approve|reject` | `SAVDOGRAPH:DECIDE` plus `ACCOUNT_OWNER` | Appends one final decision or an auditable denied/idempotent/conflict outcome. |
| `GET /api/savdograph/action-ledger` | `SAVDOGRAPH_LEDGER:READ` | Reads the immutable local decision trace. |

The `proposal_id` database uniqueness constraint plus a pessimistic proposal
lock makes concurrent/repeated decisions deterministic. Equivalent retries add
an `IDEMPOTENT` ledger event and return the original result; opposite decisions
return a `409` conflict. An approval constructs an existing `PurchaseOrderService`
request only from server-resolved product/supplier data, checks the result is
`DRAFT`, and rolls back the decision/result trace if that operation fails.

## B1.1 persistence and financial-semantics gate

`V43` adds `EvidenceItem.hashVersion`: old rows are `B1_LEGACY`; the service
creates and accepts for new proposals only `B1_CANONICAL_V1`, whose content hash
covers every calculation-defining evidence field. `V44` is a Java Flyway
migration: PostgreSQL receives append-only triggers for evidence, final
decisions, and action-ledger rows plus tenant-reference triggers for evidence,
proposals, proposal/evidence links, and decisions. H2 deliberately executes no
PostgreSQL trigger DDL but records the same migration version.

`PermissionService` in the License Server is the permission vocabulary source
for JWT minting. B1.1 registers `SAVDOGRAPH`, `SAVDOGRAPH_LEDGER`, and
`DECIDE`; ACCOUNT_OWNER receives read/write/decide/ledger-read defaults. An
override may be granted but cannot bypass the backend's exact `ACCOUNT_OWNER`
decision check.

`B2_FINANCIAL_SEMANTICS.md` is binding for B2: only a source-backed Gross
Profit Brief is eligible when inputs are proven; net profit is prohibited.
PostgreSQL parity was deferred at this stage until a disposable local PostgreSQL database applies V42–V44 and proves the triggers at runtime.

## B2 deterministic backend contract

`POST /api/savdograph/gross-profit-briefs` and `POST /api/savdograph/reorder-simulations` use only `SAVDOGRAPH:WRITE`; their reads use `SAVDOGRAPH:READ`. They append canonical evidence and AnalysisRun snapshots, never create a proposal/PO or alter inventory, prices, suppliers, payments, deliveries, or provider state. See `B2_API_CONTRACT.md`; PostgreSQL runtime parity remains deferred through V45.

## B3 grounded store-copilot boundary

`POST /api/savdograph/ask` is a read-only query protected by `SAVDOGRAPH:READ`. Tenant/shop authority is taken only from authenticated server context; `shopId`, account authority, permissions, and tool definitions are not accepted from the model or request body.

The only provider-visible tools are the deterministic B2 Gross Profit Brief, bounded tenant-filtered product search, and deterministic B2 reorder simulator. They can append AnalysisRun/evidence/audit records but cannot approve/reject, create a PurchaseOrder, mutate stock or prices, contact a supplier, receive/deliver goods, or make a payment. More than five sequential tool calls, any parallel tool-call batch, an unknown tool, ambiguous product selection, cross-tenant product/evidence, or an unsupported business number fails closed.

Provider payloads exclude tenant IDs, raw authority, credentials, customer/employee/supplier contacts, raw personal identifiers, and hidden reasoning. Product and tool text is untrusted data. Final visible numbers must be present in the current deterministic tool result and map to current-interaction immutable evidence; Gross Profit cannot be relabeled Net Profit. Provider failures never fall back to the generic chat chain.

B4 is limited to the frontend experience: render the B1/B2/B3 contracts, evidence/classification/assumption/limitation states, multilingual Ask flow, deterministic simulator, proposal human-review controls, and ledger. B4 must not add backend semantics, provider tools, permissions, autonomous actions, deployment, or production changes.

## B3.5 dedicated proposal bridge boundary

B4 may create a pending review proposal only through
`POST /api/savdograph/reorder-simulations/{analysisRunId}/proposals`, protected
by `SAVDOGRAPH:WRITE`. The strict body is `{ "supplierId": <numeric Long> }`;
B4 must not submit product, quantity, evidence, classification, shop/tenant,
price, cost, proposal status, or PurchaseOrder status.

The backend accepts only the exact current canonical B2 reorder evidence set and
`ESTIMATED` classification. It derives the product and positive integral
quantity, preserves all evidence IDs, and returns `201` for creation or `200`
for an equivalent idempotent replay. A different supplier or finalized proposal
is a `409` conflict.

The bridge ends at `DecisionProposal.PROPOSED` and one append-only
`PROPOSAL_CREATED_FROM_REORDER_SIMULATION` event. Only the existing separate
ACCOUNT_OWNER decision endpoint may later approve/reject; approval remains
idempotent and creates at most one PurchaseOrder `DRAFT`. Frontend work must not
add autonomous actions, provider tools, backend calculations, or weaker evidence
handling. See `B3_5_PROPOSAL_BRIDGE_CONTRACT.md` for the exact contract and B4
retry prompt.

## B4 frontend ownership boundary

The owner workspace is implemented at `/savdograph` in the existing React
shell. `SavdoGraph.jsx` orchestrates authenticated store state;
`features/savdograph/model.js` owns permission/bounds/request-safety helpers and
route-local UZ/RU/EN content; `components.jsx` owns typed result/evidence/
decision/ledger presentation; and `savdograph.css` owns route-scoped responsive
styles. See `B4_OWNER_WORKSPACE_CONTRACT.md` for the complete API matrix.

Navigation and direct route rendering use effective permissions returned by
`/me`; decision controls additionally require exact `ACCOUNT_OWNER`. No
editable form/local-storage field grants approval authority. The shared API
client remains the only source of bearer and `X-Shop-Id` context.

The B3.5 bridge helper emits only numeric `supplierId`; simulation output,
evidence, quantity, classification and tenant authority are not copied into the
request. Approval/rejection is a separate dialog and is not rendered complete
until the backend confirms it. B4 changes no backend, formula, evidence,
provider/tool, permission, idempotency, PO, deployment or production semantics.

## B5.0 release-readiness collaboration

Codex performed this mission directly in the existing worktree. No additional
subagent was started for B5.0. The release-readiness boundary was treated as a
hard safety contract: local inspection and validation were allowed; external or
stateful actions remained approval-gated.

### Direct evidence collected

- exact root, branch, HEAD, clean precondition, milestone ancestry, and absence
  of interrupted Git operations;
- frontend tests/build/audit and backend focused/full/package results with
  timestamps and totals;
- sanitized current-tree and production-bundle security scans;
- installed browser/version and Playwright cache/configuration;
- server environment-variable presence only, never values;
- Docker/PostgreSQL binaries, service state, listeners, migration chain, and
  disposable runtime options;
- sanitized remote host, existing refs/tags, upstream status, README gaps,
  deployment templates, guarded demo seeds, and CI gates.

### Actions deliberately not taken

- no push, PR, tag, merge, release, deploy, server connection, SSH-key access,
  DNS/Nginx change, service start/restart, database creation/migration, account
  creation, OpenAI request, browser installation, video upload, `/feedback`, or
  Devpost submission;
- no production data, credentials, customer/supplier contacts, or raw provider
  payloads were read or printed;
- no product-code fix was made after the browser exposed the supplier-loading
  defect;
- no pass screenshot was captured from an incomplete journey.

### Browser truth finding

The existing mocked test initially intercepted Vite module URLs containing
`/api/` and returned JSON, producing a blank page. Codex narrowed the test route
to true `/api/` paths and added a loopback server/system-Chrome configuration.
The corrected run reached the real SavdoGraph UI and exposed the supplier effect
bug. This distinction matters: the harness issue was fixed in test-only code;
the product issue remains an explicit B5.1 blocker.

### Approval discipline

The final map keeps twelve actions separate: existing browser use, optional
browser install, live OpenAI smoke, temporary PostgreSQL runtime, demo database,
Git push, demo deploy, demo migration, judge account, Nginx/DNS/traffic, video
upload, and final submission. Approval for one must never be inferred as
approval for another.

### Handoff truth

Starting release baseline is full commit
`27f1c04c9a935bd0496fb4f814f3e950f99ac634`. B5.0 release documentation and
safe mocked-browser changes remain uncommitted because the complete local
browser gate did not pass. The next mission must fix the narrow product defect,
complete the seed gaps, rerun the full journey, and re-evaluate the commit gate.
Current verdict: `B5_1_SAFE_TO_START=NO`.

## B5.1 retry collaboration record

The retry authorization was applied narrowly. Codex first re-verified the exact
repository, branch, starting HEAD, and the explained B5 worktree; it did not
reset, stash, clean, switch, or discard anything. Real Chrome measurements
identified the global topbar, shop switcher, and right controls as the width
owners before product CSS changed.

Implementation stayed CSS-first and inside the existing shell. No auth/shop/
theme behavior, provider contract, backend formulas, evidence semantics,
proposal state, permission model, deployment file, or production system was
changed. Notification/user controls were not removed; the current shell exposes
shop, language, theme, date, sidebar, and existing account controls unchanged.

Codex added a focused long-name browser regression and made the complete mocked
decision journey run independently at every required viewport. Screenshots were
withheld until all four journey gates passed. The final evidence is Chrome
150.0.7871.125, equal client/scroll/body widths at every viewport, zero browser
errors, frontend 112/112, backend 377/377, and zero high-confidence secret hits.

At the close of B5.1, live OpenAI and PostgreSQL parity were still deferred;
push, deploy, migration, account, traffic, video upload, and submission remained
separate gates. B5.2A below supersedes only that historical PostgreSQL state.

## B5.2A PostgreSQL parity collaboration record

The B5.2A approval was applied only to an independent temporary PostgreSQL
runtime. Codex re-verified the exact root, branch, clean worktree, required HEAD
and ancestry before starting. It used installed PostgreSQL 18.1 binaries, a
unique directory under `C:\tmp`, loopback `127.0.0.1:55432`, random process-only
database identity/credentials, UTF-8, deterministic timezone, data checksums,
and SCRAM before application traffic. The Manual/Stopped Windows service was
read only and never controlled.

Flyway applied V1-V46 with 46 successful rows and Hibernate validated the
schema through `org.postgresql.jdbc.PgConnection`. Actual PostgreSQL execution
proved V44 evidence/decision/ledger append-only triggers, V46 database-backed
bridge uniqueness and rollback, four tenant-reference trigger failures, and an
application-service approval flow that creates at most one DRAFT without
ordering, receiving, inventory, purchase-lot, notification, provider, or
cross-tenant side effects.

The temporary cluster was fast-stopped, its listener was verified closed, its
validated unique directory was removed, and task variables were cleared. The
normal affected 68/68 and full backend 377/377 suites plus package also passed;
their H2 paths remain separate from the PostgreSQL proof. Flyway's PostgreSQL
18.1-versus-tested-16 warning is retained as a limitation.

Current database result is `POSTGRES_PARITY=VERIFIED`. No production/remote
database, OpenAI request, push, deploy, account, public traffic, upload, or
submission was authorized or performed. `LIVE_OPENAI_SMOKE=DEFERRED`; all
external actions remain separate approval gates.

## B5.2C offline diagnosis collaboration record

Codex worked directly in the existing worktree and used no subagent. It first
re-verified root, branch, required ancestry, clean status, PostgreSQL parity,
and API-key presence only. The key value was never read, copied, hashed,
validated, logged, persisted, or used. Network request count remained zero.

The review was bounded to the committed B3 groundedness path and fake-provider
tests. The historical B5.2B draft cannot be recovered, so its exact root remains
`G. INSUFFICIENT_EVIDENCE_TO_DETERMINE`. Concrete offline gaps were fixed
without relaxing current-interaction, tenant, fact citation, narrative numeric,
classification, Gross-vs-Net, read-only, or human-approval invariants.

The exact Uzbek fake-provider path and 20-case matrix passed; focused 38/38,
affected 80/80, full backend 389/389, and package completed offline. No live
retry, provider request, production/remote database, push, deploy, account,
traffic, upload, feedback, or submission action occurred. A single live retry
is only a separately approval-gated next step.
