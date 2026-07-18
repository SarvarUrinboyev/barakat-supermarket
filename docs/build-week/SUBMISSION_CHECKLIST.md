# SavdoGraph Final Submission Checklist

This checklist is intentionally strict. A checkbox may be marked complete only
with direct evidence from the exact release commit and isolated demo environment.

## Current release gate

- [x] `VERIFIED` repository, branch, starting commit, ancestry, and explained retry worktree.
- [x] `VERIFIED` frontend 112/112 tests.
- [x] `VERIFIED` frontend production build.
- [x] `VERIFIED` frontend production dependency audit: 0 vulnerabilities.
- [x] `VERIFIED` seed 6/6 and affected B1/B2/B3/B3.5 68/68 tests.
- [x] `VERIFIED` final full backend 377/377 tests.
- [x] `VERIFIED` backend package and SHA-256 recorded.
- [x] `VERIFIED` current-tree secret, database-credential, and frontend-bundle scans.
- [x] `VERIFIED` supplier-loading blocker fixed with focused regression coverage.
- [x] `VERIFIED` deterministic demo refund/supplier seed gaps closed.
- [x] `VERIFIED` complete Chrome journey passed at all four viewports.
- [x] `VERIFIED` isolated PostgreSQL 18.1 V1-V46 parity proof.
- [ ] `BLOCKED_NEEDS_APPROVAL` run one live OpenAI smoke, if selected for the demo.

Do not push, deploy, publish, or submit while any required item above remains
unchecked.

## Repository and README

- [ ] `DEFERRED` add a concise README section for SavdoGraph AI.
- [ ] State the problem, target merchant, and product outcome.
- [ ] Explain deterministic evidence -> simulation -> human decision -> DRAFT -> ledger.
- [ ] Explain how GPT-5.6 is used and bounded by tools, strict schemas, and evidence.
- [ ] Explain that Gross Profit is not Net Profit.
- [ ] Explain pre-existing SavdoPRO work versus Build Week commits.
- [ ] Link exact test commands and current evidence.
- [ ] Link demo instructions without embedding credentials.
- [ ] List known limitations: Flyway/PostgreSQL support warning, live-smoke status,
  live provider status, DRAFT-only approval, no supplier/payment execution.
- [ ] Decide public repository versus private judge access.
- [ ] `BLOCKED_NEEDS_APPROVAL` push the exact tested Build Week descendant.
- [ ] Confirm the published branch contains baseline, B1, B1.1, B2, B3, B3.5,
  B4, and the final approved release commit.

## Isolated demo environment

- [ ] `BLOCKED_NEEDS_APPROVAL` create a separate demo database and role.
- [ ] Prove there is no production database hostname, credential, route, or data.
- [ ] `BLOCKED_NEEDS_APPROVAL` apply Flyway V1-V46 to the empty demo database.
- [ ] Record Flyway history, V44 triggers/constraints, V45 provenance, and V46 uniqueness.
- [ ] `BLOCKED_NEEDS_APPROVAL` start a separate demo application service/container.
- [ ] Start a separate demo License Server service/container.
- [ ] Use a separate least-privilege environment file.
- [ ] Configure CPU/memory limits and non-root runtime.
- [ ] Build the SPA with `VITE_DEMO_DATA=true`.
- [ ] Keep payment, fiscal, SMTP, supplier messaging, and unrelated providers disabled.
- [ ] Store any OpenAI key server-side only; never expose it to the SPA.
- [ ] `BLOCKED_NEEDS_APPROVAL` add a distinct HTTPS demo hostname/upstream.
- [ ] Verify health checks from local upstream before public routing.
- [ ] Record artifact path, byte size, SHA-256 before and after transfer.
- [ ] Record a demo-only rollback command and previous artifact/database snapshot.

## Deterministic anonymized seed

- [x] `VERIFIED` guarded seed is disabled under `prod` and `test`.
- [x] `VERIFIED` reserved demo tenants, shops, products, costs, sales, and expenses exist.
- [x] `VERIFIED` at least two searchable demo products can exist.
- [x] `VERIFIED` one visible refund has transaction-time cost provenance.
- [x] `VERIFIED` one tenant-owned contact-free demo supplier exists.
- [x] `VERIFIED` deterministic ESTIMATED reorder scenario.
- [x] `VERIFIED` proposal input remains supplier-only; quantity/evidence are server-derived.
- [x] `VERIFIED` one owner approval/replay creates exactly one PurchaseOrder DRAFT.
- [x] `VERIFIED` one separate rejection creates no PurchaseOrder.
- [x] `VERIFIED` ledger timeline contains proposal/evidence/decision/outcome.
- [x] `VERIFIED` UZ/RU/EN behavior on anonymized mocked/test data.
- [x] `VERIFIED` tenant B cannot read or decide tenant A records.
- [ ] Confirm no real customer, employee, supplier, sale, phone, address, or credential
  is present in the seed or screenshots.

## Judge account

- [ ] `BLOCKED_NEEDS_APPROVAL` create a dedicated ACCOUNT_OWNER in the isolated
  demo License Server only.
- [ ] Bind the account to the reserved demo tenant and intended shop.
- [ ] Grant only required SavdoGraph and ledger permissions.
- [ ] Set credential and expiry server-side.
- [ ] Deliver the credential out of band; never put it in Git, video, screenshots,
  Devpost prose, logs, or chat.
- [ ] Verify login, shop scope, route access, refresh, and logout.
- [ ] Verify a non-owner cannot see or open SavdoGraph.
- [ ] Document post-event revoke/delete ownership.

## Browser proof

- [ ] `DEFERRED` complete `/savdograph` route load with zero console/page error.
- [ ] Gross Profit Brief shows valid period, currency, calculation version, and evidence.
- [ ] Uzbek Ask Your Store answer cites evidence.
- [ ] Evidence Viewer shows safe structured inputs and closes with Escape.
- [ ] Focus returns to the evidence opener after keyboard close.
- [ ] Product search returns at least two anonymized candidates.
- [ ] Reorder simulation displays deterministic quantity, coverage, and risks.
- [ ] Supplier selection enables and uses only a tenant-owned supplier.
- [ ] Proposal appears in pending/review state.
- [ ] Approval dialog says human action and DRAFT-only result.
- [ ] Rejection path creates no draft.
- [ ] Action Ledger shows actor, evidence, decision, outcome, and timestamp.
- [ ] UZ/RU/EN switching works.
- [ ] Permanent Demo Data label is visible at every capture size.
- [ ] No horizontal overflow at `1440x900`.
- [ ] No horizontal overflow at `1024x768`.
- [ ] No horizontal overflow at `768x1024`.
- [ ] No horizontal overflow at `390x844`.
- [ ] Capture pass screenshots only after the entire journey passes.

## OpenAI smoke, only if approved

- [ ] `BLOCKED_NEEDS_APPROVAL` obtain explicit one-request cost/credential approval.
- [ ] Confirm `OPENAI_API_KEY` is present only in the demo server environment.
- [ ] Confirm allowed model is `gpt-5.6-terra` or `gpt-5.6-sol`.
- [ ] Keep `store=false`, strict schemas, no parallel tools, max 5 sequential tools.
- [ ] Ask only the anonymized approved question and period.
- [ ] Confirm answer is typed, classified, evidence-cited, and numerically grounded.
- [ ] Confirm minimized audit events exist without raw question/provider body/key.
- [ ] Record latency/status without recording credential or provider payload.
- [ ] Stop after the single approved request.

## Submission assets

- [ ] `NOT_STARTED` 3:2 project thumbnail with no live data or credentials.
- [ ] `NOT_STARTED` gallery screenshots from the final verified release.
- [ ] `NOT_STARTED` public/unlisted YouTube video, maximum 2:50.
- [ ] `BLOCKED_NEEDS_APPROVAL` repository URL published and judge-accessible.
- [ ] `BLOCKED_NEEDS_APPROVAL` stable HTTPS demo URL.
- [ ] Judge instructions include browser, URL, tenant scope, and safe fallback.
- [ ] Judge credential delivered out of band.
- [ ] README matches the exact release commit.
- [ ] GPT-5.6 usage explanation matches the source-verified contract.
- [ ] Pre-existing versus Build Week explanation matches Git history.
- [ ] `/feedback` Codex Session ID collected only after final workflow completion.
- [ ] Known limitations are visible and not softened.
- [ ] Test evidence includes commands, totals, timestamps, and blockers.
- [ ] Deployment evidence includes artifact hash, health, migration, and smoke results.
- [ ] Rollback evidence applies only to the isolated demo.

## Final publication approvals

- [ ] Explicit approval to push.
- [ ] Explicit approval to deploy demo.
- [ ] Explicit approval to execute demo migrations.
- [ ] Explicit approval to create judge account.
- [ ] Explicit approval to change Nginx/DNS/traffic.
- [ ] Explicit approval to upload the video.
- [ ] Explicit approval to submit Devpost.

## Final truth check

- [ ] Final Git worktree is clean.
- [ ] Exact release commit is recorded.
- [ ] CI for that commit is green or any missing CI evidence is explicitly stated.
- [ ] No secret file is tracked or untracked.
- [ ] No screenshot/video contains credentials, IP addresses, provider payloads,
  real contacts, production records, or hidden reasoning.
- [ ] Every live claim has direct evidence from the exact release commit.
- [x] `B5_1_SAFE_TO_START=YES` was re-evaluated after the browser blocker and
  seed gaps closed; the local retry/commit gate passed.

## B5.1 retry local completion - 2026-07-19

- [x] Exact root, branch, and starting commit re-verified.
- [x] Expected dirty worktree preserved; no reset, stash, clean, or branch switch.
- [x] Global 390px topbar overflow reproduced and measured before editing.
- [x] Minimal CSS-first topbar/shop-switcher responsive fix verified.
- [x] Long shop name truncates without losing its accessible name.
- [x] Shop, language, theme, and mobile menu controls remain keyboard/touch reachable.
- [x] Full SavdoGraph journey passed independently at 1440, 1024, 768, and 390.
- [x] All four viewports recorded equal client/document/body scroll widths.
- [x] Browser console and page error counts were zero at every viewport.
- [x] Eight anonymized Demo Data screenshots captured only after browser gates.
- [x] Frontend 112/112, backend 377/377, build, package, and audit passed.
- [x] Source, production bundle, and changed-file high-confidence scans returned zero.
- [x] No production/deployment path changed and no autonomous action was added.

Still intentionally open:

- [ ] `LIVE_OPENAI_SMOKE=DEFERRED` - requires separate credential/cost approval.
- [ ] Push, deploy, migration, judge account, traffic, video upload, and Devpost
  submission each require their own explicit approval.
- [x] B5.1 implementation commit recorded as `2f369018836518ccbb48bbcb218eed12189715e8`.

The earlier `B5_1_SAFE_TO_START=NO` line is historical B5.0 evidence. The retry
closed its local blockers; external publication gates remain closed.

## B5.2A PostgreSQL parity completion - 2026-07-19

- [x] Installed PostgreSQL 18.1 binaries used; no software installed and Docker not used.
- [x] Unique localhost-only `C:\tmp\savdograph-b52a-<unique-id>` cluster used on port 55432.
- [x] Random role/database/credential values remained process-only and were not recorded.
- [x] Flyway V1-V46 applied: 46 successful history rows, final version 46.
- [x] PostgreSQL application context and Hibernate schema validation passed 1/1.
- [x] All six evidence/decision/ledger UPDATE/DELETE attempts were rejected and rows unchanged.
- [x] V46 duplicate/conflicting proposals were rejected by `uq_sg_proposal_bridge_source`.
- [x] Failed proposal-plus-ledger transaction rolled back without partial rows.
- [x] Four cross-tenant references were rejected by enabled database triggers.
- [x] Approval produced exactly one DRAFT; replay was idempotent; no operational state or notification appeared.
- [x] Normal affected backend 68/68, full backend 377/377, and package build passed.
- [x] Temporary listener closed, cluster removed, process variables cleared.
- [x] Windows PostgreSQL service remained Manual/Stopped; no remote/production/OpenAI access occurred.

Current local database gate: `POSTGRES_PARITY=VERIFIED`. The temporary parity
cluster is not a deployed demo database; the separate demo environment,
live-provider, push, deploy, account, traffic, upload, and submission gates stay
closed.
