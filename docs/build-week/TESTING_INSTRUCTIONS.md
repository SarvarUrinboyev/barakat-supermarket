# SavdoGraph AI — Testing Instructions

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

Required SavdoGraph additions before a release claim:

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
nakladnoy totals. New SavdoGraph tests must cover Evidence Card rendering,
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

This is a local import-safety check only; it is not a substitute for SavdoGraph
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
PostgreSQL triggers; record `POSTGRES_PARITY=DEFERRED` unless a disposable local
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
`POSTGRES_PARITY=DEFERRED`; do not start the stopped Windows PostgreSQL service.
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

`LIVE_OPENAI_SMOKE=DEFERRED` when no safe key already exists. Do not request or display a key. `POSTGRES_PARITY=DEFERRED` until a disposable PostgreSQL runtime is genuinely validated; do not start the stopped Windows PostgreSQL service.

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
`POSTGRES_PARITY=DEFERRED` unless a separately approved disposable PostgreSQL
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
