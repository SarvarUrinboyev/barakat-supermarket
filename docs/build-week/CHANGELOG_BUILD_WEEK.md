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
- PostgreSQL parity was deferred at this stage: Docker is unavailable, `postgresql-x64-18` is
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
- PostgreSQL parity was deferred at this stage; H2/Flyway V45 passed, but PostgreSQL runtime
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
- PostgreSQL parity was deferred at this stage: no disposable PostgreSQL runtime was validated and the stopped Windows PostgreSQL service was not started.
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

### B4 owner decision workspace

- Added permission-aware `/savdograph` navigation inside the existing shell,
  with a safe direct-access denial and exact ACCOUNT_OWNER decision visibility.
- Added localized UZ/RU/EN Gross Profit Brief, typed Ask Your Store, safe
  evidence drawer, deterministic reorder simulator, explicit supplier-only
  B3.5 proposal bridge, confirmation-only approval/rejection, and immutable
  Action Ledger timeline.
- Added route-scoped responsive/accessibility styling, explicit
  `VITE_DEMO_DATA` labeling, focus-managed dialogs/drawers, and safe degraded
  states without client financial calculations or autonomous action.
- Frontend tests passed `104/104` (`13` existing plus `91` focused); production
  Vite build passed; focused B3.5/B1 backend regression passed `17/17`.
- Browser execution is deferred because Playwright Chromium is not installed;
  `LIVE_OPENAI_SMOKE=DEFERRED`; PostgreSQL parity was deferred at this stage.

### B5.0 release readiness and approval map

- Revalidated the exact B4 descendant from a clean precondition: frontend
  104/104, production build, zero production dependency vulnerabilities,
  focused backend 17/17, final full backend 377/377, and backend package.
- Retained two honest warnings: the known H2 in-memory backup startup error and
  an initial full-suite webhook timing failure that passed in isolation and on
  the complete second run.
- Recorded the current package artifact, size, and SHA-256 without uploading or
  deploying it.
- Repeated high-confidence current-tree secret, private-key, PostgreSQL
  credential, production-bundle, provider-internal, and hidden-reasoning scans;
  no live credential or production frontend exposure was found.
- Discovered installed Chrome 150 and added test-only Playwright support for the
  existing Chrome channel, a managed loopback mock server, permanent Demo Data
  mode, exact B5 viewports, console/page-error checks, keyboard behavior, and
  pass-only screenshots. No browser was installed.
- Fixed the mocked route harness so Vite modules under `src/api` are not returned
  as JSON. The real browser then exposed a product defect: supplier loading
  stays pending, blocking supplier selection and the proposal/approval/ledger
  portion of the B4 journey. Product code was not changed in B5.0 and no pass
  screenshot is claimed.
- Confirmed all five OpenAI environment variables are absent without reading
  values. Source contract remains GPT-5.6 server-side, `store=false`, strict
  schemas, max five sequential tool calls, and evidence-grounded audit output.
  No provider request or cost was incurred.
- Confirmed Docker engine is unavailable, PostgreSQL 18 binaries are installed,
  the Windows service is stopped, and no local listener exists. Prepared an
  approval-gated independent temporary-cluster method; no service/database was
  started and H2 was not relabeled as PostgreSQL parity.
- Added release readiness, submission checklist, final video script, screenshot
  shot list, isolated demo topology, judge-account plan, and twelve explicit
  approval gates.
- Identified current seed gaps: no visible refund and no tenant-owned demo
  supplier. A narrow seed-only B5 artifact is required; no production data may
  be copied.
- No push, PR, deploy, migration, account creation, traffic change, video
  upload, `/feedback`, or final submission occurred.
- Current verdict: `B5_1_SAFE_TO_START=NO`.

### B5.1 final demo blocker remediation

- Added a guarded, idempotent SavdoGraph demo artifact with one real synthetic
  refund, transaction-time cost provenance, contact-free supplier, simulation,
  proposal, owner approval/replay, rejection, exactly one DRAFT, and ledger proof.
- Replaced supplier-loading state coupling with a one-shot request coordinator;
  duplicate in-flight/repeated loads are suppressed and failure/empty states settle.
- Aligned frontend labels with backend `PROPOSED` and `DRAFT_CREATED` values
  without changing the backend state machine.
- Reproduced the global 390px topbar overflow at 390/643 and fixed it with
  narrow responsive CSS: shrinkable identity/shop controls, tablet reductions,
  mobile two-row grid, ellipsis, tighter gaps, and 44px targets.
- Added executable Chrome geometry coverage for long shop names, accessibility,
  keyboard controls, sidebar behavior, bounded resize events, desktop/tablet/mobile
  containment, and SavdoGraph route width.
- Converted the mocked journey into four independent complete viewport gates;
  all passed at 1440, 1024, 768, and 390 with zero console/page errors.
- Captured eight pass-only anonymized screenshots after all viewport gates.
- Final local validation: frontend 112/112, backend 377/377, audit zero,
  source/bundle/changed-file scans zero, builds and `git diff --check` passed.
- No production/deploy file, autonomous action, push, deployment, migration,
  provider request, public upload, or submission was added/performed.
- Deferred gates remain `LIVE_OPENAI_SMOKE=DEFERRED` and
  PostgreSQL parity was not started pending approval at this stage.

### B5.2A isolated PostgreSQL runtime parity

- Used installed PostgreSQL 18.1 binaries to create a unique, localhost-only,
  UTF-8, checksum-enabled temporary cluster under
  `C:\tmp\savdograph-b52a-<unique-id>`; no installation, Docker, or Windows
  service control occurred.
- Applied and validated all Flyway migrations V1-V46 on a fresh PostgreSQL
  database: 46 successful history rows, final version 46, and successful
  Hibernate schema validation over an actual PostgreSQL JDBC connection.
- Proved all six V44 append-only UPDATE/DELETE paths reject mutations while
  preserving inserted rows; confirmed all seven SavdoGraph triggers enabled.
- Proved V46 database uniqueness for equivalent/conflicting proposals and full
  rollback of a failed proposal-plus-ledger transaction.
- Proved four database tenant-reference rejections and application-level
  cross-tenant invisibility on actual PostgreSQL.
- Proved one approval creates exactly one PurchaseOrder DRAFT and replay returns
  the same DRAFT, with no ORDERED/RECEIVED state, inventory mutation, purchase
  lot, or supplier notification.
- Re-ran normal affected tests `68/68`, full backend `377/377`, and package;
  artifact remained 94,778,762 bytes with SHA-256
  `2dc2bd3c395381cecb00a89f6c2244b2f348c7c94a40cbc4a1b2523193ea652d`.
- Fast-stopped only the unique temporary cluster, verified its port closed,
  removed the validated directory, and cleared process-only task variables.
  The Windows service remained Manual/Stopped and no remote/production database
  or OpenAI provider was contacted.
- Retained Flyway's warning that PostgreSQL 18.1 exceeds its tested PostgreSQL
  16 ceiling; runtime migration and required PostgreSQL behavior nevertheless
  passed. Current result: `POSTGRES_PARITY=VERIFIED`;
  `LIVE_OPENAI_SMOKE=DEFERRED`.

### B5.2C offline groundedness diagnosis

- Preserved the sanitized B5.2B failure and classified its exact historical
  draft cause as `G. INSUFFICIENT_EVIDENCE_TO_DETERMINE`; no raw provider
  output or missing subreason was reconstructed.
- Added typed privacy-safe groundedness reasons with fixed field paths and
  evidence counts while keeping ordinary user failures generic.
- Bound monetary units/currency to cited evidence; exact differing currency,
  value, classification, tenant, interaction, and terminology still fail closed.
- Serialized the B2 calculation version, handled only exact structured metadata
  tokens, required non-empty fact citations, and rejected ANSWERED results with
  no result evidence.
- Added the exact Uzbek two-exchange fake-provider fixture and the required
  20-case offline reproduction matrix.
- Passed focused 38/38, affected 80/80, full backend 389/389, and package.
  No network/OpenAI request, operational side effect, formula/tool-registry
  change, push, deployment, or live retry occurred.

### B5.2D bounded live OpenAI retry

- Performed exactly one separately approved live interaction with anonymized
  synthetic data and the committed `SAVDOGRAPH_COPILOT_V1` path.
- Verified two provider exchanges, actual model `gpt-5.6-terra`, Uzbek
  `ANSWERED / VERIFIED`, and only
  `get_daily_gross_profit_brief`.
- Verified eight current-interaction immutable evidence references plus exact
  numeric, currency/unit, classification, Gross-vs-Net, and narrative-number
  groundedness.
- Verified privacy and no-side-effect gates; no raw body, full answer, hidden
  reasoning, key data, tenant identifier, contact/personal data, production
  record, or operational write was persisted.
- Recorded sanitized provider latency of 7,345 ms and wall latency of 10,257 ms.
- No manual retry, product change, push, deployment, feedback, upload, or
  submission occurred. `LIVE_OPENAI_RETRY=VERIFIED`.

### B5.3D same-origin License gateway and Railway runtime compatibility

- Added a closed, explicit backend `/api/license` facade for every frontend-used
  License auth, session, billing, and administrator route. It uses only a
  server-side private License URL, bounded JSON/response handling, timeouts,
  safe errors, no redirects, bearer-only auth forwarding, and backend
  administrator defense in depth.
- Moved browser License requests to the same-origin facade and removed the
  direct-origin configuration path. The client now translates the established
  `/api/...` License endpoint vocabulary to the facade without changing the
  underlying authentication model.
- Made backend and License Server ports Railway `PORT` compatible; documented
  isolated License H2 volume persistence, variables, public/private network
  boundaries, manual demo setup, and rollback.
- Added in-process gateway regression coverage and passed backend 395/395,
  License 157/157, frontend 116/116, builds, audit, Docker images, and real
  synthetic staging E2E 3/3. No Railway resource or deployment was created.
