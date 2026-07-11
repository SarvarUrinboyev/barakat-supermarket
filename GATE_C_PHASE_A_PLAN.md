# GATE C — PHASE A: Recon + Plan (per-product currency)

**Status: STOP — awaiting Sarvar approval. No code changed.**
Full render-site inventory (raw, ~90 sites with file:line): workflow output `C:\Users\Laptop\AppData\Local\Temp\claude\C--Users-Laptop-Downloads-barakat-supermarket\ff6bc265-f846-4533-a8e6-1a1d836fc9a0\tasks\wnv2h3fw8.output`. Key citations inline below.

---

## 0. The finding that changes the brief (honest-report clause)

**R1's premise — "stored values ARE som" — is true only for script-imported rows. Everything created through the UI is stored in USD.**

- The app's canonical unit is **USD everywhere**, documented in `format.js:1` ("The shop trades in US dollars") and in the DB despite misleading column names: `sales.total_uzs`, `sale_items.unit_price_uzs` (V19) **hold USD values** ([Pos.jsx:859](frontend/src/pages/Pos.jsx) renders `totalUzs` with `usd()`).
- **ScanModal + ProductEditor convert so'm input → USD at the CBU rate before saving** ([ProductEditor.jsx:196-197](frontend/src/pages/ProductEditor.jsx) `uzsToUsd`, [ScanModal.jsx:104-107](frontend/src/components/ScanModal.jsx) `priceToUsd`). The current shop's ~70 products are therefore **USD-denominated** — the dashboard's `$1 079.45` is a *correct* reading of stored data, not a display bug.
- **`warehouse_import.py` never converts** (no kurs/usd logic in the file) — shop 6's 6 598 rows hold **raw som numbers inside USD-semantic columns**. That's the real corruption R1 sensed, and the old-prod inventory value `262 557 334.87` confirms it.
- The pending 6 114-row CSV (T7, som prices) would recreate exactly this corruption in the new tenant if imported before this gate lands.
- Half-built infra already exists and should be reused: `Currency` enum (`Currency.java:4`), per-row `currency` on expenses/home_expenses/management_costs/payments (V7), `MoneyConverter.toUsd` (`MoneyConverter.java:37`, CBU + hardcoded 12700 fallback), frontend `formatMoney/convertMoney` (`format.js:23,31`) + `CurrencyToggle` + `useExchangeRate`.
- Known seam bug this gate must NOT worsen: ledger posts **sales raw-as-USD** but converts expenses/payments (`LedgerPostingService.java:160-176` vs `230-281`) — the "single-scale gotcha". Also pre-existing: POS `Payment` created without currency → entity default UZS on USD amounts (`PosService.java:262-279` + `Payment.java:52`).

## 1. A1 — why `$` renders everywhere

`usd()` hardcodes `'$'` (`format.js:18`) and is the dominant formatter (~90 render sites). Highest-leverage shared site: `MetricCard` **defaults to `usd()`** (`ui.jsx:98-104`; `currencyCode` prop already opts into `formatMoney`). Hot spots: Pos.jsx (12 sites: cart, grid, pay modal, totals), PosHistory.jsx (11 incl. XLSX header "Jami USD"), Warehouse.jsx (list `:250`, XLSX headers "(USD)" `:132`, frontend-computed Ombor qiymati/Potensial foyda cards `:79-87,164-165`), ProductEditor/ScanModal hints, Dashboard, Reports, Debts (`+50$` button), receipt print path, i18n (~20 labels embed "(USD)"/"(so'm)"). Gap-hunter extras: **mobile customer app** `CatalogSyncService.java:131` converts every price USD→som at a fixed env rate (a UZS-native price would inflate ×~12 800 — must be currency-aware), export/print hardcoded USD headers, `usd()` strings persisted into ledger descriptions (CustomerDetail:642), `Receipt.jsx` dead code (skip).

## 2. A2 — migration + selector surfaces

- **V38** (V37 latest; license-server chain untouched):
  ```sql
  ALTER TABLE products ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'UZS';
  -- backfill: see DECISION-1; no index (never filtered hot)
  ALTER TABLE shops ADD COLUMN usd_rate NUMERIC(12,2);          -- tenant kurs, NULL = not configured
  ALTER TABLE sales ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD';  -- backfills OLD rows as USD (their true unit)
  ALTER TABLE sales ADD COLUMN usd_rate_at_sale NUMERIC(12,2);
  ALTER TABLE sale_items ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD';
  ALTER TABLE sale_items ADD COLUMN usd_rate_at_sale NUMERIC(12,2);         -- D6 per-line pin
  ```
- Entity: `Product.currency` reuses the existing `Currency` enum (STRING mapping like `Payment.java`). Note V7 precedent has DDL-default `'USD'` vs entity-default `UZS` mismatch — I'll keep DDL and entity both UZS for products.
- Selector surfaces: ProductEditor + ScanModal (replace the current *convert-on-save* toggle — conversion code is **removed**, the toggle becomes the product's stored currency, default UZS, USD explicit); goods-receipt/kirim flow uses product's currency; CSV import: optional `Valyuta` column is genuinely trivial (one alias in `ProductImporter.java:36-45`, one `ImportRow` field, `buildRow` + 2 call sites, template string `ProductController.java:142`, modal text `ImportModal.jsx:55`) → **include it**, default UZS.

## 3. A3 — kurs (usd_rate)

- Store: `shops.usd_rate` (V16 register-profile precedent — shops table IS the per-tenant config store; no settings/KV table exists anywhere). Owner/admin-editable via small POS header widget (whiteboard pattern) + product pages; permission `SHOPS:WRITE`.
- `MoneyConverter` gains shop-rate-first lookup (CBU stays only as the scanner-hint display; the hardcoded 12700 fallback dies for money math). **No kurs + USD line in cart → checkout blocked** with explicit message (D6 hard rule).
- Sale time: pin `usd_rate_at_sale` on sale + each line. New sales stored **som-canonical** (USD lines × pinned kurs into `line_total_uzs`; native `$` unit price + currency kept per line for display/receipt annotation `$1 350 @ 12 650`). Old sales stay USD (tagged by the sales.currency backfill) — readers (`SaleRepository.summaryBetween:31`, ReportService, dashboards) become currency-aware via the same split pattern DashboardService already uses for expenses.
- **Mandatory seam fix in scope:** ledger posting of sales converts via `toUsd` like expenses already do (`LedgerPostingService.java:173`) — otherwise som-canonical sales corrupt the P&L. Full Buxgalteriya multi-currency rework stays out of scope (D7), but this one write-site cannot be deferred.

## 4. A4 — hygiene check: BLOCKED

`ssh -i ~/.ssh/savdopro_vps root@168.119.64.239` → `Permission denied (publickey,password)` (same as Gate D0; key rotated during hardening?). Run yourself:
```sql
SELECT s.id, s.name, s.main, count(p.id) FROM shops s LEFT JOIN products p ON p.shop_id=s.id GROUP BY 1,2,3 ORDER BY 4 DESC;
```
Also useful for DECISION-1: `SELECT currency_guess, count(*) FROM (SELECT CASE WHEN purchase_price >= 1000 THEN 'som-like' ELSE 'usd-like' END currency_guess FROM products) t GROUP BY 1;`

## 5. Decisions needed from Sarvar

- **DECISION-1 (revised — original "backfill all→UZS" is unsafe):** the ~70 UI-created products hold **USD values**; labeling them UZS shows "3.66 so'm" garbage. Options:
  **(a) [recommended]** backfill `currency='USD'` for UI-created shops' rows (honest to stored values; you bulk-edit som-goods afterwards — for 70 rows that's minutes, and the 6 114 import then arrives natively UZS); shop-6-style script-imported rows → `'UZS'`.
  (b) backfill UZS + one-time value conversion ×kurs for the 70 (lossy, needs a chosen kurs).
  (c) wipe the 70 and re-import everything as UZS.
- **DECISION-2 (aggregates):** split-only (`X so'm` + `$Y`) vs split+combined-in-so'm when kurs set. **Recommend split+combined** — POS needs kurs configured anyway, and one "jami so'mda" line is what a shop owner actually reads.
- **DECISION-3 (new, from recon):** confirm the sales-storage direction above (new sales som-canonical + per-line pinned rate + old rows tagged USD) and the mandatory ledger seam fix. Alternative — keep sales USD-canonical and convert only at display — touches fewer readers but bakes ÷kurs rounding into every som sale forever.

## 6. Phase B shape (estimate)

7 commits: V38 migration+backfill | backend currency plumbing (entity/DTO/import/converter/ledger seam) | frontend formatter sweep (~90 sites, grep-proof no `usd(`/`'$'` outside format.js) | POS math + kurs widget + block rule | aggregates split (Warehouse cards move backend-side or get currency from `ProductResponse`; Management/Analytics/AI splits) | mobile CatalogSync currency-awareness | tests (formatter, migration/backfill, USD e2e, mixed cart, no-kurs block, import default, SQL-verified aggregate splits). Riskiest areas: analytics native SQL (`StockMovementRepository:49`), ledger reconciliation, mobile sync.

**STOP. Awaiting DECISION-1/2/3 + A4 output + approval to start Phase B.**

---

## 7. APPROVED 2026-07-11 — amendments folded in (Phase B GO)

Verdict: 8.5, GO with AM-1…AM-6. Decisions final: D1(a) per AM-3, D2 split+combined, D3 per AM-2.

**Discriminator resolved (AM-3) — evidence, `file:line`:**
- P2 (UI import) → `stock_movements.note = 'Import (fayldan)'` ([ProductService.java:387](backend/src/main/java/uz/barakat/market/service/ProductService.java)). Cleanly taggable.
- Genuine-70 (UI create) → `note = 'Boshlang'ich qoldiq'` ([ProductService.java:112](backend/src/main/java/uz/barakat/market/service/ProductService.java)).
- **P1 (script) uses `POST /api/products`** ([warehouse_import.py:330](imports/warehouse_import.py)), i.e. the manual-create path → `note = 'Boshlang'ich qoldiq'` too. **P1 is schema-identical to the genuine-70; they differ only by shop.** No column separates them.
- Consequence: the generic, tested backfill can only use the note rule (correct for the *operational* shop: genuine-70→USD, P2→UZS). It **would mislabel P1→USD** because P1 looks hand-created. P1 lives in its own non-operational shop and is handled by the AM-4 ops step (dispose if unreferenced, else shop-keyed UZS relabel). No prod shop id is baked into the versioned migration.
- Zero-qty imported rows log no movement → default UZS (the column default) still labels them correctly.

**Final migration split:**
- **V38 (versioned, generic, tested):** add `products.currency` (DEFAULT UZS), `shops.usd_rate`, `sales/sale_items.currency` (DEFAULT USD) + `usd_rate_at_sale`; note-based products backfill; per-line sales backfill = product's currency (null product_id → USD). Test asserts counts on a seeded fixture (3 hand→USD, 5 import→UZS).
- **AM-4 P1 disposal + any P1 relabel:** a reversible **ops SQL runbook** (`docs/ops/gate-c-p1-cleanup.md`), shop-keyed, run on prod once SSH restored + Sirojiddin confirms who ran the script and against which shop. NOT in the Flyway chain (a single tenant's data cleanup must not run on every fresh/test DB).

**AM-1 provenance:** all prod counts in §0 (shop 6 = 6598; 262M value) come from `migration-handoff/current-production-snapshot.md` — an OLD-prod artifact captured 2026-07-01, **not a live query**. Prod remains SSH-blocked (§4). These are UNVERIFIED against the current box; A4 re-issue + AM-2 quantification queries are shipped in the ops runbook for Sarvar to run.

**AM-2 quantification (ship queries, don't guess):** before trusting relabeled historical reports, run on prod — count sale_items since the import date whose product is UZS-population, and count null-product lines (ambiguous). V38 relabels per product-join with null→USD fallback; runbook carries the verify queries.

**AM-5 (mobile) + AM-6 (ledger seam):** both in-scope for B with paired tests — mobile CatalogSync reads per-product currency + tenant kurs (no ×12800 on a native-UZS price); ledger sale postings convert per-currency like expenses already do, with a before/after trial-balance reconcile test on a seeded dataset.
