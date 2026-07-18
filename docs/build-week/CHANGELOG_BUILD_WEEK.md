# SavdoGraph AI — Build Week Changelog

This log contains only work performed for the SavdoGraph AI Build Week
submission. It does not relabel historical SavdoPRO/Barakat work as new.

## Unreleased — 2026-07-18

### Added

- Established the Build Week provenance baseline at
  `bffc4326fdbb95e9f9e620759d5897848c451cb8`.
- Added `PREEXISTING_WORK.md` with the cutoff comparison, Git evidence and
  source-backed 20-row capability matrix.
- Added `BUILD_WEEK_SCOPE.md` with the exact five-minute journey, narrow
  must-have slice, architecture contract, acceptance criteria and non-goals.
- Added `CODEX_COLLABORATION.md` to lock safety, tenant/privacy, human approval,
  evidence and release rules.
- Added `TESTING_INSTRUCTIONS.md` and `DEMO_SCRIPT.md` for reproducible,
  non-production validation and demo behavior.

### Audited, not implemented

- Existing POS, inventory, forecast/reorder, supplier, purchase-order, generic
  AI chat, anomaly, audit and seeded-demo capabilities were classified as
  pre-existing in `PREEXISTING_WORK.md`.
- Existing generic AI chat is not credited as Ask Your Store: it can accept a
  final answer without deterministic tool evidence, has no durable Evidence
  Card/Approval/Action Ledger, and its legacy `ORDER` action is not a permitted
  SavdoGraph action path.
- No feature source, migration, endpoint, provider configuration, deployment,
  production database, production infrastructure or customer data was changed.

### Validation record

- Current-HEAD sanitized secret-pattern scan found no high-confidence private
  key, GitHub, OpenAI, AWS, Google, Slack or JWT token-prefix match.
- `frontend` production dependency audit reported zero vulnerabilities;
  `electron` reported one moderate transitive `js-yaml@4.1.1` vulnerability via
  `electron-updater@6.8.3`, with a reported fix available.
- With a shell-local JDK 21.0.11, backend tests passed `308/308`, license tests
  passed `157/157`, and both Maven packages built successfully. Frontend Vitest
  passed `13/13` and its isolated build succeeded; Python import safety passed
  `10/10`. Docker-backed E2E remains blocked because the local daemon is not
  available. See `TESTING_INSTRUCTIONS.md` for exact commands and limits.

### Known baseline risks recorded for implementation

- AI tool authorization is too coarse for supplier/expense tool data.
- Existing provider payloads can include contact fields; Build Week must minimize
  and redact them before any external provider call.
- Cross-shop transfer movements, per-SKU discount/refund semantics and mixed
  currency naming make some existing analytics unsuitable as unqualified
  evidence. The Daily Profit Brief uses net P&L and a single declared demo
  currency until those historical issues are separately resolved.

## Pre-Build-Week baseline

All reachable commits before 2026-07-13, including tag `v2.3.4` and baseline
HEAD `bffc4326`, are pre-existing SavdoPRO/Barakat work. `git log --all --since
'2026-07-13T00:00:00+05:00'` returned no committed changes at audit time.

The original working tree also contained uncommitted files at audit start. Their
provenance cannot be proven from Git, so they are neither claimed here nor
included in this branch.
