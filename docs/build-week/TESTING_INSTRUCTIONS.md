# ProofTwin AI — Testing Instructions

## Safety boundary

Run checks only from a clean Build Week worktree. Do not point any command at a
production database, production `.env`, production host, real provider key, or
customer/supplier data. The staging Compose stack uses generated demo data and is
not PostgreSQL production parity.

At initial preflight, the active Java was `1.8.0_481`, Node was `v24.14.0`, and
the Docker daemon was unavailable. A shell-local JDK 21.0.11 was then selected
for Maven validation. CI requires Java 21 and Node 20; the frontend audit result
below is useful but not Node-20 parity. Record the actual versions used with
every future run.

## Audit run results — 2026-07-18

| Check | Result | Notes |
|---|---|---|
| Backend tests | `PASS` — 308 tests, exit 0 | JDK 21.0.11; H2/Flyway context tests ran. Test-profile startup logs attempted an H2 in-memory backup and emitted warnings/errors, but Maven reported no test failure. |
| Backend package | `PASS`, exit 0 | JDK 21.0.11, `-DskipTests package`. |
| License tests | `PASS` — 157 tests, exit 0 | JDK 21.0.11 and H2 test profile. Do not treat this as PostgreSQL proof. |
| License package | `PASS`, exit 0 | JDK 21.0.11, `-DskipTests package`. |
| Frontend Vitest | `PASS` — 13 tests, exit 0 | Node 24.14.0; CI still pins Node 20. |
| Frontend isolated build | `PASS`, exit 0 | Node 24.14.0; output was external to the repository. Vite warned of a 938.60 kB minified `ExportButton` chunk. |
| Python import safety | `PASS` — 10/10, exit 0 | No production source/data path used. |
| Secret-pattern scan | `PASS` — five sanitized baseline rules returned 0 | Current committed baseline only; it was not a historical Git scan. |
| Frontend production audit | `PASS` — 0 vulnerabilities, exit 0 | `npm audit --package-lock-only --omit=dev`. |
| Electron production audit | `FAIL` — 1 moderate vulnerability, exit 1 | Transitive `js-yaml@4.1.1` via `electron-updater@6.8.3`; no dependency change was made. |
| Docker staging E2E / PostgreSQL parity | `BLOCKED` | Docker client is installed but `dockerDesktopLinuxEngine` was unavailable. No service was started. |
| Lint / format / typecheck | `NOT_CONFIGURED` | No repository scripts/configuration exist for the JavaScript/JSX frontend. |

## Preflight

```powershell
git status --short --branch
git rev-parse HEAD
java -version
node --version
npm --version
docker version
```

Expected branch: `feat/build-week-savdograph-ai`. A dirty tree must be explained
before a validation claim is made.

## Backend: unit, integration, and migration-context validation

Select JDK 21 for this shell only, then run the Maven wrapper:

```powershell
# Set these only after locating an installed JDK 21. Do not change global machine state.
$env:JAVA_HOME = 'C:\path\to\jdk-21'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Set-Location .\backend
.\mvnw.cmd -B --no-transfer-progress test
.\mvnw.cmd -B --no-transfer-progress -DskipTests package
```

Surefire explicitly includes `*Test`, `*Tests`, and `*IT` in
`backend/pom.xml`; this is the supported local migration/context check. There is
no standalone Flyway Maven validation command configured. Do not substitute a
production database for an unavailable local test dependency.

Required ProofTwin additions before a release claim:

- golden calculations for daily P&L and reorder simulation;
- unsupported numeric model-output rejection;
- per-tool least-privilege authorization;
- tenant A/B isolation for evidence/proposal/simulation/ledger;
- proposal `PROPOSED → APPROVED|REJECTED → DRAFT_CREATED` idempotency and no-spend
  negative cases.

## License server

```powershell
Set-Location .\license-server
.\mvnw.cmd -B --no-transfer-progress test
.\mvnw.cmd -B --no-transfer-progress -DskipTests package
```

CI additionally boots the license context against PostgreSQL. If Docker is
unavailable, record the unavailable Docker evidence rather than treating an H2
result as PostgreSQL proof.

## Frontend: unit test and isolated build

Use Node 20 for CI-parity. The default Vite output path is inside backend static
resources, so use an external temporary directory for an audit build.

```powershell
Set-Location .\frontend
npm ci
npm test
$validationOutput = Join-Path $env:TEMP "savdograph-frontend-build-$PID"
npm run build -- --outDir $validationOutput
```

The baseline has three Vitest files covering format, customer balance and
nakladnoy totals. New ProofTwin tests must cover Evidence Card rendering,
unsupported-number behavior, approval/rejection state, and simulator edge cases.

There is no repository-defined frontend lint, format, or typecheck script. The
frontend is JavaScript/JSX with no TypeScript or ESLint configuration. Report
those checks as **not configured**, never as passed.

## Python import safety test

```powershell
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:PYTHONUTF8 = '1'
python .\imports\test_warehouse_import.py
```

This is a local import-safety check only; it is not a substitute for ProofTwin
workflow validation.

## Docker staging and Playwright E2E

Run only after `docker version` succeeds and only against the local staging file:

```powershell
docker compose -f docker-compose.staging.yml up -d --build
Set-Location .\frontend
npm ci
npx playwright install chromium
npm run e2e
```

The baseline smoke covers landing, seeded login/dashboard and POS catalogue. Add
a focused seeded flow for: brief → question → evidence → simulation →
approve/reject → ledger. Capture both desktop and 375px viewport evidence. Never
reuse this command or its seeded credentials against production.

## Sanitized secret and dependency checks

The audit found no high-confidence private-key, GitHub, OpenAI, AWS, Google,
Slack or JWT token-prefix hit in tracked baseline files. Do not print candidate
values while repeating a scan:

```powershell
$rules = @(
  'BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY',
  'gh[pousr]_[A-Za-z0-9_]{20,}',
  'sk-[A-Za-z0-9]{20,}',
  'AKIA[0-9A-Z]{16}',
  'AIza[0-9A-Za-z_-]{20,}'
)
foreach ($rule in $rules) {
  $count = (git grep -I -E $rule HEAD -- | Measure-Object).Count
  "rule=$rule count=$count"
}
```

Dependency audit commands:

```powershell
Set-Location .\frontend
npm audit --package-lock-only --omit=dev --json
Set-Location ..\electron
npm audit --package-lock-only --omit=dev --json
```

At baseline, the frontend production audit reported zero vulnerabilities. The
Electron audit reported one moderate transitive `js-yaml@4.1.1` vulnerability via
`electron-updater@6.8.3`; resolve or explicitly accept it before a public release.

`gitleaks`, `trivy`, `osv-scanner`, `semgrep`, `pip-audit`, and a Maven CVE scan
were not available/configured during the audit. Historical Git blobs, deployed
secret storage, rotation and live infrastructure were intentionally out of scope.

## Required result record

For every command, record:

| Check | Command | Runtime versions | Exit code | Result / blocker |
|---|---|---|---:|---|
| Backend tests | wrapper command above | Java | | |
| Backend package | wrapper command above | Java | | |
| License tests/package | wrapper commands above | Java | | |
| Frontend Vitest/build | npm commands above | Node | | |
| Staging E2E | Compose + Playwright | Docker/Node | | |
| Python import test | command above | Python | | |
| Secret scan | sanitized rules | Git | | |
| Dependency audit | npm audit | Node/npm | | |

Do not mark a Build Week release ready until every applicable row has a fresh,
recorded result or an explicit, user-accepted blocker.

## B1 focused backend foundation

Run the focused B1 suite on the test-profile H2 database:

```powershell
Set-Location .\backend
.\mvnw.cmd -q '-Dtest=SavdoGraphControllerIT,SavdoGraphTransactionRollbackIT,ProviderExplanationPayloadMapperTest' test
```

It proves the `V42` migration/context can boot on H2; tenant A cannot read or
decide tenant B's analysis/evidence/proposal records; non-owners are denied and
that attempt is ledgered; owner approval creates one `PurchaseOrder` in `DRAFT`;
same-decision retries are idempotent; opposite decisions conflict; no supported
quantity can bypass immutable server-calculated evidence; the provider mapper is
an allow-list; and a forced PO failure rolls back final decision/success-ledger
state. It does not contact an AI provider, supplier, payment system, or a
production database.

## B1.1 persistence hardening

Run the B1.1 backend regression set on H2:

```powershell
Set-Location .\backend
.\mvnw.cmd -q '-Dtest=SavdoGraphControllerIT,SavdoGraphTransactionRollbackIT,ProviderExplanationPayloadMapperTest,EvidenceContentHasherTest,AppendOnlyRepositoryContractTest,V44SavdoGraphPostgresqlHardeningMigrationTest' test
```

This verifies canonical evidence-hash coverage, V43/V44 H2 migration boot,
application-route immutability, cross-tenant proposal/evidence rejection, and
the static PostgreSQL trigger/constraint contract. H2 does **not** prove the
PostgreSQL triggers; at that stage PostgreSQL parity remained deferred unless a disposable local
PostgreSQL run proves them.

For License Server permission registration:

```powershell
Set-Location .\license-server
.\mvnw.cmd -q '-Dtest=PermissionServiceTest' test
```

Do not start an existing Windows PostgreSQL service or reuse an application
database just to satisfy this gate. PostgreSQL parity requires Docker or a
separately confirmed disposable localhost database, never a production name,
credential, or host.

For PostgreSQL migration parity once Docker is available, create a fresh,
disposable local database; do not reuse a compose service or an application
database. The controller regression above remains explicitly H2-backed, so use
the context-smoke test to apply Flyway under the PostgreSQL environment and
inspect the installed trigger names:

```powershell
$env:SG_B11_POSTGRES_PASSWORD = [guid]::NewGuid().ToString('N')
docker run --name savdograph-b11-pg --rm -d -p 55432:5432 `
  -e POSTGRES_DB=savdograph_b11 -e POSTGRES_USER=savdograph_b11 `
  -e POSTGRES_PASSWORD=$env:SG_B11_POSTGRES_PASSWORD postgres:16-alpine
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://localhost:55432/savdograph_b11'
$env:SPRING_DATASOURCE_USERNAME = 'savdograph_b11'
$env:SPRING_DATASOURCE_PASSWORD = $env:SG_B11_POSTGRES_PASSWORD
Set-Location .\backend
.\mvnw.cmd -q '-Dtest=ApplicationContextSmokeTest' test
docker exec savdograph-b11-pg psql -U savdograph_b11 -d savdograph_b11 -Atc "SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE 'trg_sg_%' ORDER BY tgname"
docker stop savdograph-b11-pg
Remove-Item Env:SG_B11_POSTGRES_PASSWORD,Env:SPRING_DATASOURCE_URL,Env:SPRING_DATASOURCE_USERNAME,Env:SPRING_DATASOURCE_PASSWORD
```

Record the actual migration and trigger-runtime result separately; source/static
tests and trigger-name inspection alone do not prove rejected `UPDATE`/`DELETE`
behavior.

## B2 deterministic brief and simulator

```powershell
Set-Location .\backend
.\mvnw.cmd -q '-Dtest=SavdoGraphB2ControllerIT,SavdoGraphControllerIT,SavdoGraphTransactionRollbackIT,ProviderExplanationPayloadMapperTest,EvidenceContentHasherTest,AppendOnlyRepositoryContractTest,V44SavdoGraphPostgresqlHardeningMigrationTest' test
```

This covers B2 formulas, cost/currency classification, rounding, zero/negative
cases, Asia/Tashkent boundaries, canonical evidence, retrieval, tenant isolation,
and absence of PO, inventory-movement, and price side effects. H2 applies V45.
PostgreSQL parity was deferred at this stage; do not start the stopped Windows PostgreSQL service.
B3 must retain this classification/evidence boundary and run PostgreSQL runtime
trigger proof before any release claim.

## B3 grounded multilingual Ask Your Store

Focused B3 validation uses only fake provider transports, mocks, and an empty `OPENAI_API_KEY`; it must never contact OpenAI:

```powershell
Set-Location .\backend
.\mvnw.cmd -q '-Dtest=SavdoGraphB3ControllerIT,OpenAiResponsesStoreCopilotProviderTest,StoreCopilotGroundingValidatorTest,StoreCopilotServiceTest' test
```

The focused slice covers configured model/key isolation, strict Responses API shape, no persistence/hidden-reasoning request, refusal/incomplete/timeout/rate/network/auth failures, retry bounds, invalid structured output, missing-key behavior, UZ/RU/EN and AUTO language selection, ambiguity, Gross-vs-Net Profit, read-only allow-list, five sequential calls, parallel-call rejection, current tenant product/evidence visibility, immutable evidence numeric grounding, privacy redaction, malicious data, audit minimization, request bounds, permission denial, and PO/stock-movement no-side-effect checks. Current result: `38/38` passed.

Current B3 completion results: affected B1/B2/B3 tests `57/57`; full backend `365/365` with zero failures/errors/skips; backend package passed. Frontend production dependency audit passed with zero vulnerabilities. Electron audit exited 1 on the unchanged `electron-updater` -> `js-yaml` chain, reporting two moderate findings and no available fix; B3 changed no Electron dependency or source.

Run the affected B1/B2/B3 regression set, then the full backend suite and package:

```powershell
.\mvnw.cmd -q '-Dtest=SavdoGraphB3ControllerIT,OpenAiResponsesStoreCopilotProviderTest,StoreCopilotGroundingValidatorTest,StoreCopilotServiceTest,SavdoGraphB2ControllerIT,SavdoGraphControllerIT,SavdoGraphTransactionRollbackIT,ProviderExplanationPayloadMapperTest,EvidenceContentHasherTest,AppendOnlyRepositoryContractTest,V44SavdoGraphPostgresqlHardeningMigrationTest' test
.\mvnw.cmd -q test
.\mvnw.cmd -q -DskipTests package
```

B3 reuses the already registered `SAVDOGRAPH:READ` permission and does not change the License Server permission vocabulary, so the License Server is not touched by this increment. H2/Flyway is exercised by `SavdoGraphB3ControllerIT` and the affected/full suites. Use the existing sanitized dependency and secret checks; do not print matched secret values.

`LIVE_OPENAI_SMOKE=DEFERRED` when no safe key already exists. Do not request or display a key. PostgreSQL parity was deferred at this stage until a disposable PostgreSQL runtime is genuinely validated; do not start the stopped Windows PostgreSQL service.

## B3.5 canonical simulation-to-review bridge

Run the focused bridge slice on the test-profile H2 database:

```powershell
Set-Location .\backend
.\mvnw.cmd -q '-Dtest=SavdoGraphProposalBridgeIT,SavdoGraphProposalBridgeRollbackIT' test
```

Current focused result: `12/12`, zero failures/errors/skips. It covers exact
B2 evidence reconstruction, `ESTIMATED` eligibility, strict supplier-only input,
tenant isolation, tamper/missing/duplicate/cross-run/cross-unit rejection,
positive integral quantity bounds, database-backed retry/concurrency safety,
transaction rollback, one success ledger, no PurchaseOrder/stock/price/provider
side effects, and existing owner-only idempotent DRAFT approval.

Run the affected B1/B2/B3/B3.5 regression set:

```powershell
.\mvnw.cmd -q '-Dtest=SavdoGraphProposalBridgeIT,SavdoGraphProposalBridgeRollbackIT,SavdoGraphControllerIT,SavdoGraphTransactionRollbackIT,SavdoGraphB2ControllerIT,SavdoGraphB3ControllerIT,OpenAiResponsesStoreCopilotProviderTest,StoreCopilotGroundingValidatorTest,StoreCopilotServiceTest,AppendOnlyRepositoryContractTest,EvidenceContentHasherTest,V44SavdoGraphPostgresqlHardeningMigrationTest' test
```

Then run the full backend suite and package:

```powershell
.\mvnw.cmd -q test
.\mvnw.cmd -q -DskipTests package
```

B3.5 changes no permission vocabulary, so License Server tests are not required.
H2/Flyway validates V46 in the focused, affected, and full suites. Record
PostgreSQL parity was deferred at this stage unless a separately approved disposable PostgreSQL
runtime proves the migration; do not start the stopped Windows service. Keep
`LIVE_OPENAI_SMOKE=DEFERRED`; this bridge has no provider path and needs no key.

Validation record for this increment:

- focused bridge: `12/12`, passed;
- affected B1/B2/B3/B3.5: `68/68`, zero failures/errors/skips;
- full backend: `377/377`, zero failures/errors/skips;
- backend package: passed (`mvnw.cmd -q -DskipTests package`);
- changed-file high-confidence secret scan: zero private-key/token/JWT-prefix matches;
- frontend/electron sources and dependency locks: unchanged; frontend production audit passed with zero vulnerabilities; Electron retained the pre-existing `electron-updater` -> `js-yaml` chain with two moderate findings and no available fix;
- provider/model and License Server configuration: unchanged;
- PostgreSQL runtime: deferred; H2/Flyway V46 validated;
- live OpenAI smoke: deferred and not applicable to this provider-free bridge.

## B4 owner workspace validation

Run all configured frontend tests:

```powershell
Set-Location .\frontend
npm test -- --reporter=dot
```

Expected B4 record: `6` files, `104/104` tests passed. This includes `13`
pre-existing format/customer/print regressions and `91` focused ProofTwin
model/component cases. No dedicated `typecheck` script exists in
`frontend/package.json`; do not claim one.

Run the configured production build:

```powershell
npm run build
```

Expected B4 record: Vite build passes and emits separate SavdoGraph JS/CSS
chunks to the configured ignored `backend/src/main/resources/static` output.
The existing large `ExportButton` chunk warning is non-blocking and unrelated.

Run the smallest backend contract regression from `backend`:

```powershell
Set-Location ..\backend
.\mvnw.cmd '-Dtest=SavdoGraphProposalBridgeIT,SavdoGraphControllerIT' test
```

Expected B4 record: `17/17` passed, covering B3.5 supplier-only bridging,
evidence/tamper/tenant/idempotency safety, owner-only decisions, and at-most-one
PurchaseOrder `DRAFT` with no operational/provider side effect.

The mocked browser journey is:

```powershell
Set-Location ..\frontend
$env:E2E_BASE_URL='http://127.0.0.1:4174'
npx playwright test e2e/savdograph.mock.spec.js --reporter=list
```

It requires a separate local Vite server. The B4 machine has no Playwright
Chromium executable, so `BROWSER_VERIFICATION=DEFERRED`. Do not download a
browser or access staging/production without the B5 approval gate.
`LIVE_OPENAI_SMOKE=DEFERRED`; PostgreSQL parity was deferred at this stage.

## B5.0 release-readiness validation - 2026-07-18/19

B5.0 reran the release gates without installing software, starting services,
contacting OpenAI, connecting to a database/server, pushing, or deploying.

### Verified commands and results

Frontend from `frontend`:

```powershell
npm test -- --reporter=dot
npm run build
npm audit --omit=dev
```

Results:

- Vitest: 6 files, 104/104 tests, exit 0.
- Vite production build: 524 modules, exit 0. The pre-existing 938.60 kB
  `ExportButton` chunk warning remains.
- Production dependency audit: 0 vulnerabilities, exit 0.

Backend from `backend`:

```powershell
.\mvnw.cmd '-Dtest=SavdoGraphProposalBridgeIT,SavdoGraphControllerIT' test
.\mvnw.cmd -q test
.\mvnw.cmd -DskipTests package
```

Results:

- focused bridge/decision slice: 17/17, exit 0;
- first full run: 376/377 with one
  `ApiIntegrationFlowTest.webhookEnqueueAndDispatchMarksDelivered` failure;
- isolated rerun of that test: 1/1, exit 0;
- complete final rerun: 377/377, zero failures/errors/skips, exit 0;
- package: exit 0; current JAR SHA-256 is recorded in
  `B5_RELEASE_READINESS.md`.

The first-run webhook failure is a retained flaky-test risk. H2 startup also
continues to log the known non-fatal in-memory backup error. Neither warning was
hidden or cleared with unrelated product changes.

License Server tests/package were not rerun because B3 through B4 changed no
License Server permission model or files.

### Existing Chrome mocked journey

No Playwright browser installation is required on this machine. Chrome 150 is
available through channel `chrome`. The B5 mocked command is:

```powershell
Set-Location .\frontend
$env:E2E_SAVDOGRAPH_MOCK = '1'
$env:E2E_BROWSER_CHANNEL = 'chrome'
.\node_modules\.bin\playwright.cmd test e2e/savdograph.mock.spec.js
```

The Playwright config owns a loopback Vite server at `127.0.0.1:4174`, sets
`VITE_DEMO_DATA=true`, and keeps every business API mocked. The test checks
`1440x900`, `1024x768`, `768x1024`, and `390x844`; Demo label; overflow;
console/page errors; and Escape/focus-return behavior. Screenshots are written
only after all functional and responsive assertions pass.

Current result is `BROWSER_VERIFICATION=BLOCKED_PRODUCT_DEFECT`. The journey
reaches reorder simulation, but the supplier select remains disabled because
the supplier-loading effect depends on and mutates `supplierLoading`; cleanup
invalidates the in-flight result. Do not capture submission screenshots or
claim proposal/approval/ledger browser proof until this product defect is fixed
and the same command passes end to end.

### OpenAI readiness check

Do not inspect or print values. Check presence only:

```powershell
$names = @(
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'OPENAI_REASONING_EFFORT',
  'OPENAI_MAX_OUTPUT_TOKENS',
  'OPENAI_TIMEOUT_SECONDS'
)
foreach ($name in $names) {
  $present = -not [string]::IsNullOrWhiteSpace(
    [Environment]::GetEnvironmentVariable($name))
  "$name=$(if ($present) { 'PRESENT' } else { 'ABSENT' })"
}
```

All five were absent during B5.0. `LIVE_OPENAI_SMOKE_READY=NO`; no provider
request was sent. A future smoke requires explicit credential-use/cost approval
and a server-side-only key in an isolated demo environment.

### PostgreSQL readiness check

Docker engine is unavailable. PostgreSQL 18 client/server/init binaries are
installed, while the `postgresql-x64-18` Windows service is Manual/Stopped and
no listener exists on 5432, 5433, or 55432. The service was not started.

`POSTGRES_PARITY_READY=YES` means an independent temporary cluster can be
created under a validated `C:\tmp\savdograph-b5-pg` path using installed
`initdb`/`pg_ctl`, without using the Windows service cluster. Runtime parity is
still `BLOCKED_NEEDS_APPROVAL` and `NOT_STARTED`. It must apply V1-V46, inspect
V44/V45/V46, prove append-only and uniqueness behavior with synthetic rows,
then stop and remove only the validated temporary cluster. H2 never counts as
this proof.

### Final B5.0 status

- `LIVE_OPENAI_SMOKE_READY=NO`
- `POSTGRES_PARITY_READY=YES` (method ready; result not run)
- `BROWSER_VERIFICATION=BLOCKED_PRODUCT_DEFECT`
- `B5_1_SAFE_TO_START=NO`

See `B5_RELEASE_READINESS.md` for exact timestamps, artifact hash, security
scan results, deployment topology, demo seed gaps, and the approval table.

## B5.1 final responsive and release validation - 2026-07-19

Use JDK 21 by prepending `$env:JAVA_HOME\bin` for backend commands. The exact
fresh gates were:

```powershell
Set-Location .\frontend
$env:E2E_SAVDOGRAPH_MOCK = '1'
$env:E2E_BROWSER_CHANNEL = 'chrome'
.\node_modules\.bin\playwright.cmd test e2e\topbar.responsive.spec.js
.\node_modules\.bin\playwright.cmd test e2e\savdograph.mock.spec.js
.\node_modules\.bin\vitest.cmd run src\features\savdograph --reporter=dot
npm test -- --reporter=dot
npm run build
npm audit --omit=dev

Set-Location ..\backend
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\mvnw.cmd '-Dtest=DemoDataSeederGuardTest,DemoDataSeederIT' test
.\mvnw.cmd '-Dtest=SavdoGraphProposalBridgeIT,SavdoGraphProposalBridgeRollbackIT,SavdoGraphControllerIT,SavdoGraphTransactionRollbackIT,SavdoGraphB2ControllerIT,SavdoGraphB3ControllerIT,OpenAiResponsesStoreCopilotProviderTest,StoreCopilotGroundingValidatorTest,StoreCopilotServiceTest,AppendOnlyRepositoryContractTest,EvidenceContentHasherTest,V44SavdoGraphPostgresqlHardeningMigrationTest' test
.\mvnw.cmd -q test
.\mvnw.cmd -q -DskipTests package
```

Results:

- focused responsive Chrome: 1/1 passed with executable geometry at 1440/1024/768/390;
- full mocked Chrome: 5/5 passed; screenshots gated after four independent journeys;
- geometry: 1440/1440, 1024/1024, 768/768, and 390/390
  (`clientWidth/document scrollWidth/body scrollWidth` all equal);
- browser errors: console 0 and page 0 at every viewport;
- focused ProofTwin: 99/99; full frontend: 112/112;
- build: 525 modules, exit 0; audit: 0 vulnerabilities;
- seed: 6/6; affected B1/B2/B3/B3.5: 68/68;
- full backend: 377/377, zero failures/errors/skips; package: exit 0, JAR SHA-256 `2dc2bd3c395381cecb00a89f6c2244b2f348c7c94a40cbc4a1b2523193ea652d`;
- frontend source, production bundle, and changed-file high-confidence scans: zero;
- `git diff --check`: exit 0.

The initial sandboxed Vitest startup attempts hit Windows `spawn EPERM` before
loading tests; the same commands passed outside that process sandbox. H2's
non-persistent backup-startup warning is retained and does not count as
PostgreSQL parity. Keep `LIVE_OPENAI_SMOKE=DEFERRED`; the B5.2A section below
supersedes the earlier PostgreSQL pending state.

## B5.2A PostgreSQL 18.1 parity - 2026-07-19

This gate used only the installed PostgreSQL 18.1 CLI/runtime. A new unique
cluster under `C:\tmp\savdograph-b52a-<unique-id>` bound to
`127.0.0.1:55432`; the Windows service stayed Manual/Stopped. The empty
bootstrap used localhost trust only long enough to set the random process-only
role password, after which `pg_hba.conf` required `scram-sha-256` before any
application data or test traffic.

Sanitized parity commands:

```powershell
& '<pg18-bin>\initdb.exe' -D '<unique-temp-data>' --encoding=UTF8 --locale=C --data-checksums
& '<pg18-bin>\pg_ctl.exe' -D '<unique-temp-data>' -l '<temp-log>' -o '...127.0.0.1...55432...' start
& '<pg18-bin>\pg_isready.exe' -h 127.0.0.1 -p 55432
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://127.0.0.1:55432/<random-db>'
$env:SPRING_DATASOURCE_USERNAME = '<random-role>'
$env:SPRING_DATASOURCE_PASSWORD = '<process-only-random-value>'
Set-Location .\backend
.\mvnw.cmd -o -B --no-transfer-progress '-Dtest=ApplicationContextSmokeTest' test
.\mvnw.cmd -o -B --no-transfer-progress '-Dtest=SavdoGraphProposalBridgeIT,SavdoGraphProposalBridgeRollbackIT,SavdoGraphControllerIT,SavdoGraphTransactionRollbackIT,SavdoGraphB2ControllerIT,SavdoGraphB3ControllerIT,OpenAiResponsesStoreCopilotProviderTest,StoreCopilotGroundingValidatorTest,StoreCopilotServiceTest,AppendOnlyRepositoryContractTest,EvidenceContentHasherTest,V44SavdoGraphPostgresqlHardeningMigrationTest' test
.\mvnw.cmd -o -q test
.\mvnw.cmd -o -q -DskipTests package
& '<pg18-bin>\pg_ctl.exe' -D '<unique-temp-data>' stop -m fast
```

The first command is the sanitized shape; task automation immediately applied
the documented SCRAM transition and never printed the random value. Inspection
used sanitized `psql` scripts against only that localhost database.

Results:

- actual PostgreSQL context: 1/1 passed; JDBC connection class was
  `org.postgresql.jdbc.PgConnection`; Flyway and Hibernate schema validation passed;
- migrations: 46/46 successful, versions V1-V46, final version 46, no gap,
  skip, or checksum mismatch;
- V44: legitimate inserts passed; evidence, decision, and ledger UPDATE/DELETE
  attempts failed 6/6 with unchanged row fingerprints;
- V46: one canonical bridge proposal passed; equivalent and conflicting
  duplicates failed on `uq_sg_proposal_bridge_source`; rollback left no partial
  proposal or ledger row;
- tenant proof: four cross-shop references failed and left no rejected row;
- approval harness: one decision, one DRAFT, replay same DRAFT, no
  ORDERED/RECEIVED, inventory unchanged, zero supplier notifications, and
  cross-tenant proposal hidden;
- affected normal H2 suite: 68/68 passed; full backend: 377/377 passed;
- package: 94,778,762 bytes, SHA-256
  `2dc2bd3c395381cecb00a89f6c2244b2f348c7c94a40cbc4a1b2523193ea652d`.

Flyway emitted a support-ceiling warning because PostgreSQL 18.1 is newer than
its tested PostgreSQL 16 maximum; it did not prevent real V1-V46 migration,
schema validation, trigger execution, constraints, rollback, or service proof.
Afterward the exact cluster was fast-stopped, port closure was verified, the
unique directory was removed, and task variables were cleared. No remote or
production database, Windows service control, Docker, or OpenAI request was
used. `POSTGRES_PARITY=VERIFIED`; `LIVE_OPENAI_SMOKE=DEFERRED`.

## B5.2C offline groundedness diagnosis - 2026-07-19

No command in this phase may use the network or the OpenAI key. JDK 21 and Maven
offline mode were used:

```powershell
Set-Location .\backend
$env:JAVA_HOME = 'C:\Users\Laptop\tools\jdk-21.0.11'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\mvnw.cmd -o '-Dtest=StoreCopilotGroundingValidatorTest,StoreCopilotGroundingMatrixTest,StoreCopilotServiceTest' test
.\mvnw.cmd -o '-Dtest=SavdoGraphProposalBridgeIT,SavdoGraphProposalBridgeRollbackIT,SavdoGraphControllerIT,SavdoGraphTransactionRollbackIT,SavdoGraphB2ControllerIT,SavdoGraphB3ControllerIT,OpenAiResponsesStoreCopilotProviderTest,StoreCopilotGroundingValidatorTest,StoreCopilotGroundingMatrixTest,StoreCopilotServiceTest,AppendOnlyRepositoryContractTest,EvidenceContentHasherTest,V44SavdoGraphPostgresqlHardeningMigrationTest' test
.\mvnw.cmd -o -q test
.\mvnw.cmd -o -q -DskipTests package
```

Results:

- focused validator/service fake-provider slice: 38/38;
- affected B1/B2/B3/B3.5 slice: 80/80;
- full backend: 389/389, zero failures/errors/skips;
- package: exit 0; `barakat-market.jar`, 94,784,550 bytes, SHA-256
  `74d0d655893856c6977ac2546a81239c14186553234cf6c5198986e6781c1a76`;
- required 20 matrix variants all matched their exact safe reason;
- provider exchanges were Mockito/fake-provider calls only; network count was 0.

The known H2 in-memory backup-startup warning remained non-fatal and is not
PostgreSQL proof. The B5.2B live outcome remains failed groundedness, not passed.
A new live retry requires a separate explicit approval and must stop after one
interaction while capturing only the safe enum/path/count.

## B5.2D bounded live OpenAI retry - 2026-07-19

The separately approved live retry used a temporary, untracked harness under
`C:\tmp` around the committed provider and service. Deterministic Gross
Profit data, tenant-filtered evidence, audit capture, and safety identity were
synthetic in-memory doubles; no local, remote, or production database record
was read or written. The harness source contained no key and repository status
remained clean before network use.

Exactly one service interaction was executed with the exact approved Uzbek
question. A hard wrapper permitted at most two provider exchanges and rejected
any tool other than `get_daily_gross_profit_brief` before execution. Runtime
configuration was `gpt-5.6-terra`, medium reasoning, 1,200 maximum output
tokens, 30-second timeout, `store=false`, strict schemas, and
`parallel_tool_calls=false`.

Sanitized result:

- harness outcome: `VERIFIED`; public result: `ANSWERED`;
- exchanges: 2; actual model: `gpt-5.6-terra`; language: `uz`;
- tool: `get_daily_gross_profit_brief`; classification: `VERIFIED`;
- immutable current-interaction evidence-reference count: 8;
- numeric, tenant-scope, currency/unit, classification, terminology,
  unsupported-number, privacy, and no-side-effect proofs: pass;
- safe failure enum/path: not applicable;
- provider latency: 7,345 ms; wall latency: 10,257 ms;
- raw provider body and hidden reasoning persisted: false.

No manual retry, product-code change, push, deploy, feedback, upload, or
submission occurred. `POSTGRES_PARITY=VERIFIED` remains independently proven.
`LIVE_OPENAI_RETRY=VERIFIED`.

## B5.3D same-origin License gateway and Railway runtime contract - 2026-07-19

The browser License client now calls the public backend's fixed
`/api/license` prefix. It translates the existing License Server `/api/...`
endpoint definitions only to explicit gateway routes (for example,
`/api/auth/login` becomes `/api/license/auth/login`); no public generic proxy
or direct License origin remains.

Verified local gates:

- focused in-process gateway suite: 6/6, covering exact route mapping,
  bearer-only forwarding, header stripping, authorization, limits, failures,
  and no local account/API-key write;
- full backend suite: 395/395; backend package: pass;
- License Server suite: 157/157; License Server package: pass;
- frontend suite: 116/116; production build: pass; `npm audit --omit=dev`:
  zero vulnerabilities;
- backend and License Docker images: pass; synthetic compose health endpoints
  `/actuator/health` and `/api/health`: HTTP 200;
- real built-SPA Playwright staging smoke: 3/3 (landing, same-origin demo login,
  dashboard, and POS).

The first browser run correctly exposed the invalid intermediate path
`/api/license/api/auth/login`; the client-only prefix translation was fixed and
the exact staging smoke then passed. No Railway, OpenAI, production, payment,
inventory, supplier, deploy, or public-service action occurred.
