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
`POSTGRES_PARITY=DEFERRED` until a disposable local PostgreSQL database applies V42–V44 and proves the triggers at runtime.

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
