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
