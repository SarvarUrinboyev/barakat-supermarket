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
