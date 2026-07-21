# ProofTwin AI — Pre-existing Work Baseline

Audit date: 2026-07-18
Build Week cutoff: 2026-07-13
Audit target: `C:\Users\Laptop\Downloads\barakat-supermarket` at committed revision `bffc4326fdbb95e9f9e620759d5897848c451cb8`

## Evidence rule

This document distinguishes source evidence from runtime proof. A capability is
not credited as Build Week work merely because it appears in a README, commit
message, or UI. The state labels used below are:

- `IMPLEMENTED_AND_VERIFIED`
- `IMPLEMENTED_NOT_VERIFIED`
- `PARTIAL`
- `MOCK_ONLY`
- `DOCUMENTED_ONLY`
- `ABSENT`
- `BLOCKED`

No row is `IMPLEMENTED_AND_VERIFIED` in this matrix. The audit ran the available
backend, license, frontend and Python suites after the source review, but those
regression suites do not directly prove every row's runtime/production behavior.
The matrix therefore remains conservative; the exact check results are in
`TESTING_INSTRUCTIONS.md`.

## Git ground truth

| Item | Evidence |
|---|---|
| Repository root | `C:\Users\Laptop\Downloads\barakat-supermarket` |
| Audited baseline HEAD | `bffc4326fdbb95e9f9e620759d5897848c451cb8` — `ci: gate frontend vitest on feat (cherry-pick OPS ci.yml npm test step)` |
| Baseline branch | `feat/saas-uplift-7-19` tracking `origin/feat/saas-uplift-7-19` |
| Latest tag | `v2.3.4` (2026-07-01) |
| Last commit before the cutoff | `bffc4326fdbb95e9f9e620759d5897848c451cb8` at `2026-07-12T03:12:17+05:00` |
| Relevant commits on/after 2026-07-13 | **None.** `git log --all --since='2026-07-13T00:00:00+05:00'` returned no commits. |
| Working-tree condition at audit start | 21 modified tracked files, no staged files, and untracked `D0_SCANNER_CATALOG_REPORT.md`; the changes were deliberately not attributed to Build Week. |
| Remote | `origin` is configured as `https://github.com/SarvarUrinboyev/savdopro.git`; local evidence does not prove remote ownership or push authority. |

Useful pre-cutoff context commits include `4ef89b01` (recency-weighted demand
forecast), `741913ef` (anomaly alerts), `3fde4ef0` and `9d0f4adc` (AI tool
calling/tenant transaction fixes), `2b5073bc` (AI action chain), and `9ca8062a`
(staging/Playwright/CI work). They are historical pointers, not runtime proof.

## What existed before Build Week

SavdoPRO/Barakat already contained a multi-tenant retail platform: POS checkout,
inventory, products/pricing, reports, suppliers, purchase orders, a generic AI
assistant, guarded demo seeding, CI, and staging tooling. The following matrix is
the source-backed capability boundary at the cutoff.

| # | Capability | State | File-level evidence and audit boundary |
|---:|---|---|---|
| 1 | Sales ingestion and reporting | `IMPLEMENTED_NOT_VERIFIED` | Checkout/history/refund endpoints: `backend/src/main/java/uz/barakat/market/controller/PosController.java:41-78`; atomic sale, stock, payment and ledger flow: `service/PosService.java:121-345`; reports: `service/ReportService.java:294-327`; existing integration test: `PosEndToEndIT.java:90-181`. |
| 2 | Inventory balance | `PARTIAL` | Quantity/threshold lives on `domain/Product.java:38-59`; adjustments/receiving/stocktake use movements in `ProductService.java:168-259`. Cross-shop transfers update product quantities but do not create `StockMovement` rows (`TransferService.java:120-136,216-221`), so movement-derived analytics are incomplete. |
| 3 | Cost and selling price | `PARTIAL` | Product cost/sale/native currency: `Product.java:38-44,72-88`; POS snapshots cost/rate: `PosService.java:185-224`; historical cost schema: `db/migration/V37__sale_item_cost_snapshot.sql:17-22`. Purchase-order DTO/schema fields remain USD-named despite UZS/USD products (`PurchaseDtos.java:17-65`, `V30__purchase_orders.sql:34-65`). |
| 4 | Profit/margin analytics | `PARTIAL` | Product analytics: `AnalyticsService.java:56-90`; day P&L: `ReportService.java:283-327`; history test: `AnalyticsServiceHistoricalPriceTest.java:41-80`. Movement-based SKU calculations can omit discounts/refunds and fields are USD-named; daily profit must use net sale/sale-item semantics and an explicit currency contract. |
| 5 | Low-stock detection | `IMPLEMENTED_NOT_VERIFIED` | Threshold query `ProductRepository.java:24-30`, API `ProductController.java:60-70`, alert service `StockAlertService.java:42-64`, daily schedule `NotificationScheduler.java:77-82`. |
| 6 | Dead-stock detection | `PARTIAL` | `ForecastService.java:125-144` implements a 30-day low-velocity slow-mover heuristic. There is no durable dead-stock lifecycle, stock-age calculation, or capital-at-risk evidence. |
| 7 | Expiry information | `PARTIAL` | Optional product-level expiry date: `Product.java:86-88`, `V24__product_expiry.sql:1-8`; text-only AI result: `AiToolService.java:396-415`. No lot/batch expiry, expiry endpoint, alert/schedule, or tested workflow. |
| 8 | Sales forecasting | `IMPLEMENTED_NOT_VERIFIED` | Deterministic weighted forecast/runout/reorder quantities: `ForecastService.java:18-43,85-150`; APIs: `AiController.java:61-83`; tests: `ForecastServiceTest.java:59-101`. |
| 9 | Reorder recommendations | `IMPLEMENTED_NOT_VERIFIED` | Existing forecast provides suggested quantities and days of stock. `AutoPurchaseOrderService.java:22-24` only sends recommendation digests; it does not create a durable, approval-governed draft. |
| 10 | Supplier records | `PARTIAL` | Tenant-scoped supplier CRUD: `SupplierController.java:31-56`, `Supplier.java:21-33`. Supplier balance intentionally lacks goods-received liability intelligence (`SupplierService.java:103-123`). |
| 11 | Purchase-order creation | `IMPLEMENTED_NOT_VERIFIED` | Manual DRAFT → ORDERED → PARTIAL/RECEIVED/CANCELLED lifecycle: `PurchaseOrderService.java:65-180`, `PurchaseOrderController.java:31-70`, `V30__purchase_orders.sql:16-65`; receipt tests: `PurchaseOrderServiceTest.java:47-92`. It has no proposal/evidence/approval provenance. |
| 12 | Owner approval workflows | `ABSENT` | Current AI actions are ephemeral UI actions (`CfoActionService.java:17-84`). PO mutation is permitted by normal `PRODUCTS:WRITE` authorization (`SecurityConfig.java:156`); no proposal/approve/reject/action-ledger entity, migration, or API was found. |
| 13 | Natural-language queries | `PARTIAL` | Generic `/api/ai/ask` exists (`AiController.java:55-59`), but `AiChatService.java:230-235` accepts a final model answer without a tool, which fails the no-invented-numbers requirement. Prompt is Uzbek-only (`AiChatService.java:75-82`); Russian/English routing is unproven. |
| 14 | OpenAI/GPT integration | `ABSENT` | The configured provider chain is Gemini, NVIDIA-compatible providers, and OpenRouter (`AiChatService.java:136-148`). `OpenAiCompatProvider.java:13-23,63-82` is generic compatibility code, not proof of an official OpenAI integration. |
| 15 | Evidence/audit trail | `PARTIAL` | Generic HTTP audit records actor/method/path/status/IP (`AuditEntry.java:10-32`, `AuditInterceptor.java:29-50`); anomaly records preserve messages/details/acknowledgement (`AnomalyAlert.java:12-67`). Neither captures recommendation evidence, formula, confidence, assumptions, decision, or resultant draft action. |
| 16 | Multi-tenant isolation | `IMPLEMENTED_NOT_VERIFIED` | Account/shop boundary: `TenantFilter.java:128-147`; fail-closed filter activation: `TenantFilterAspect.java:40-65`; direct-ID defense: `TenantScopedEntity.java:59-64`; AI tenant test: `AiToolServiceTenantIT.java:53-90`. |
| 17 | Demo-data support | `IMPLEMENTED_NOT_VERIFIED` | Guarded, idempotent seed using real services: `DemoDataSeeder.java:38-62,124-151,190-259`; hard-disabled under prod: `application-prod.properties:75-79`; guard test: `DemoDataSeederGuardTest.java:22-46`. |
| 18 | Production-safe test account | `BLOCKED` | No production-safe account was proven. The only supported demo accounts are intentionally disabled in `prod`/`test`; use a local/staging seeded environment, never production. |
| 19 | Responsive owner dashboard | `IMPLEMENTED_NOT_VERIFIED` | Dashboard/report/warehouse/PO pages exist (`frontend/src/pages/Dashboard.jsx`, `Reports.jsx`, `Warehouse.jsx`, `PurchaseOrders.jsx`); responsive shell rules: `frontend/src/styles/index.css:1728-1754,3019-3048,4081-4144`. No browser visual proof was captured in this audit. |
| 20 | Deployment readiness | `PARTIAL` | CI covers backend, license, frontend build/tests and staging E2E (`.github/workflows/ci.yml:8-167`). Deploy gates backend/license tests but does not rerun frontend tests/E2E (`.github/workflows/deploy.yml:23-99`). Root Compose exposes ports 8086/9090 (`docker-compose.yml:59,97`) despite loopback/nginx migration guidance. |

## Work added between the cutoff and this audit

No committed code or documentation was found after 2026-07-13. The original
checkout did contain uncommitted changes at audit start, but their date, author,
intent, and review status cannot be proven from Git. They are excluded from both
the pre-existing and Build Week claims.

The only Build Week work created by this audit is the documentation under
`docs/build-week/` on branch `feat/build-week-savdograph-ai`. No ProofTwin AI
feature code, migration, endpoint, UI, provider configuration, deployment, or
production change has been made yet.

## Work to be newly built after this audit

The Build Week implementation must add—not relabel existing work—the following:

1. Typed daily-profit brief aggregation with deterministic source evidence.
2. Tool-enforced, multilingual Ask Your Store responses with no unsupported
   numeric claim.
3. Persisted Evidence Cards with period, formula/version, inputs, risks and
   assumptions.
4. A deterministic, reorder-only Decision Simulator.
5. A server-side owner proposal/approval/rejection state machine that can create
   only a purchase-order **draft** or employee task.
6. An immutable Action Ledger linking proposal, evidence snapshot, decision, and
   output draft.

## Uncertainty and exclusions

- This is source and local-command evidence, not a claim about the live
  production deployment, database contents, credentials, or provider plans.
- Provider keys were not read. Provider availability and actual OpenAI access
  remain unproven.
- Existing AI tools may transmit supplier/contact fields to external providers;
  see `docs/build-week/BUILD_WEEK_SCOPE.md` for the mandatory privacy boundary.
- Staging/demo data is safe only because it is hard-disabled in production. It
  is not a production demo account.
- The Build Week demo must not use customer data, unreviewed operations docs, or
  the dirty original worktree.
