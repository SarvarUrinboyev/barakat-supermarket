# SavdoGraph AI — Build Week Changelog

This log contains only work performed for the SavdoGraph AI Build Week
submission. It does not relabel historical SavdoPRO/Barakat work as new.

## Unreleased — 2026-07-18

### B1.1 persistence and financial-semantics gate

- Added `V43` evidence hash-version metadata and a canonical B1.1 evidence
  hasher. Existing B1 evidence is explicitly `B1_LEGACY`; only newly created
  `B1_CANONICAL_V1` evidence with a valid full-payload hash can support a new
  proposal.
- Added `V44` PostgreSQL-only Flyway enforcement: immutable evidence,
  decision, and ledger UPDATE/DELETE triggers; tenant-reference triggers; and
  B1 enum/value checks. H2 records the Java migration as an intentional no-op.
- Registered `SAVDOGRAPH`, `SAVDOGRAPH_LEDGER`, and `DECIDE` in the License
  Server permission vocabulary and ACCOUNT_OWNER defaults.
- Added `B2_FINANCIAL_SEMANTICS.md`, the source-backed contract that permits a
  Gross Profit Brief only when currency and cost provenance are sufficient.
- `POSTGRES_PARITY=DEFERRED`: Docker is unavailable, `postgresql-x64-18` is
  stopped, no local PostgreSQL CLI/listener is available, and no application
  database was touched.
- B1.1 focused H2 regression passed (`11/11`):
  `mvnw.cmd -q '-Dtest=SavdoGraphControllerIT,SavdoGraphTransactionRollbackIT,ProviderExplanationPayloadMapperTest,EvidenceContentHasherTest,AppendOnlyRepositoryContractTest,V44SavdoGraphPostgresqlHardeningMigrationTest' test`.
  The clean full backend rerun passed (`319/319`, zero failures/errors), after
  an earlier unrelated asynchronous webhook assertion; its isolated rerun also
  passed. License Server permissions passed (`157/157`), and both backend and
  License Server `mvnw.cmd -q -DskipTests package` builds passed.

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

### B1 backend foundation implemented

- Added `V42__savdograph_foundation.sql` with tenant-scoped analysis runs,
  immutable evidence items, reorder proposals, immutable proposal decisions,
  proposal-to-evidence links, and append-only action-ledger events.
- Added typed `/api/savdograph/**` contracts for analysis/evidence/proposal
  creation and reads, owner approval/rejection, and action-ledger reads. The
  only B1 numeric recommendation is a server-calculated low-stock-gap reorder
  quantity; the proposal endpoint accepts no client-provided numeric quantity.
- Added a provider payload allow-list that contains calculation metadata, period,
  unit/currency, result, evidence ID and content hash only. It makes no provider
  call and excludes contacts, addresses, payment data, credentials, tenant/store
  IDs, product IDs, and free text.
- Added database-locked idempotent owner decisions. `ACCOUNT_OWNER` approval can
  create exactly one existing `PurchaseOrder` in `DRAFT`; it does not invoke
  ordering, receiving, payment, supplier notification, delivery, inventory, or
  selling-price paths.
- Added focused B1 HTTP/persistence tests for A/B isolation, direct-ID denial,
  owner-only decisions, idempotency/conflict, immutable evidence, draft-only PO,
  ledger outcomes, provider minimization, and transaction rollback.

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

- B1 focused suite passed (`7/7`):
  `mvnw.cmd -q '-Dtest=SavdoGraphControllerIT,SavdoGraphTransactionRollbackIT,ProviderExplanationPayloadMapperTest' test`.
- Full backend suite passed on its second clean run (`315/315`), after an
  earlier full-suite run exposed one unrelated asynchronous webhook assertion;
  `ApiIntegrationFlowTest` also passed when rerun in isolation. No webhook code
  was changed for B1.
- `mvnw.cmd -q -DskipTests package` passed. The test profile migrated and
  validated `V42` against H2 in PostgreSQL compatibility mode. PostgreSQL/Docker
  parity remains unverified until the local Docker daemon is available.

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

### B2 deterministic brief and simulator

- Added tenant-scoped Daily Gross Profit Brief and reorder scenario endpoints,
  backed only by canonical immutable evidence.
- Added `V45` generic B2 evidence support and cost-snapshot provenance; newly
  checked-out sale items are marked `TRANSACTION_TIME`.
- Added explicit VERIFIED/ESTIMATED/INSUFFICIENT_DATA result semantics, source
  counts, Asia/Tashkent boundaries, and no-side-effect integration coverage.
- `POSTGRES_PARITY=DEFERRED`; H2/Flyway V45 passed, but PostgreSQL runtime
  triggers remain unproven. B3 is limited to an evidence-validated proposal
  bridge/presentation after that parity gate.

### B3 grounded multilingual Ask Your Store

- Recovered the existing B3-only dirty draft without discarding, stashing, resetting, or replacing any user work. The retained draft comprised the read route, bounded tenant product query, B3 controller/DTO, provider/copilot package, and four focused test classes.
- Added `POST /api/savdograph/ask` under `SAVDOGRAPH:READ`. Existing B1/B2 deterministic routes remain usable with no OpenAI key.
- Added the internal OpenAI Responses API adapter with server-only environment configuration, `store=false`, strict function and final-output schemas, `parallel_tool_calls=false`, a five-call ceiling, bounded retries, and typed safe errors.
- Registered only `get_daily_gross_profit_brief`, `search_store_products`, and `run_reorder_simulation`. Stockout-risk candidate batching was cut because no separate B2 batch contract safely preserves the required semantics.
- Added fail-closed evidence, numeric, classification, tenant, Gross-Profit-label, privacy, prompt-injection, and no-operational-claim validation. No model-accessible mutation, approval, PO, payment, supplier, delivery, receiving, inventory, or price tool exists.
- Focused B3 tests passed `38/38` with fake transports, mocks, blank provider configuration, H2/Flyway, and real tenant-filter checks. No automated test contacts OpenAI.
- The affected B1/B2/B3 regression set passed `57/57`; the full backend suite passed `365/365` with zero failures/errors/skips; and `mvnw.cmd -q -DskipTests package` passed.
- Configured production dependency audits: frontend passed with zero vulnerabilities; Electron retained an unrelated pre-existing `electron-updater` -> `js-yaml` chain and reported two moderate findings with no available fix. No dependency file was changed.
- `LIVE_OPENAI_SMOKE=DEFERRED`: no safe API key was present; no key was requested or printed.
- `POSTGRES_PARITY=DEFERRED`: no disposable PostgreSQL runtime was validated and the stopped Windows PostgreSQL service was not started.
- The next gate is B4 frontend experience only; it must consume the established B1/B2/B3 contracts without changing backend financial, evidence, provider, permission, or approval semantics.

### B3.5 canonical simulation-to-review bridge

- Added `POST /api/savdograph/reorder-simulations/{analysisRunId}/proposals`
  under the existing `SAVDOGRAPH:WRITE` rule. Its strict request accepts only
  the existing numeric `supplierId`; product, quantity, classification,
  evidence and tenant authority are resolved server-side.
- Added a dedicated validation service for a complete, current, hash-valid B2
  `REORDER_SIMULATION` evidence set. Only explicit `ESTIMATED` scenarios with
  positive integral quantities up to 100,000 and unchanged unit/SKU semantics
  are eligible.
- Added nullable proposal `sourceKind=B2_REORDER_SIMULATION` and Flyway `V46`
  uniqueness on tenant/source-run/source-kind. An AnalysisRun row lock plus the
  database constraint makes equivalent retries and concurrent submissions
  create one pending proposal and one success-ledger event.
- Preserved all 11 immutable B2 evidence IDs and the source AnalysisRun. The
  bridge writes `PROPOSAL_CREATED_FROM_REORDER_SIMULATION`, remains `PROPOSED`,
  and creates no PurchaseOrder or operational/provider side effect.
- Focused bridge and rollback tests passed `12/12`. Full validation results and
  the exact B4 retry boundary are recorded in `TESTING_INSTRUCTIONS.md` and
  `B3_5_PROPOSAL_BRIDGE_CONTRACT.md`.
