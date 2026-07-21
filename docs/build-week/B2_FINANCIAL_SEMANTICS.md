# ProofTwin AI B2 Financial Semantics Contract

**Status:** B2 deterministic implementation, 2026-07-18. This is the binding source-of-truth for the implemented Daily Gross Profit Brief and read-only reorder simulator.

## 1. Revenue

The authoritative sale aggregate is `sales` / `Sale`: `Sale.totalUzs`, `Sale.refundedTotalUzs`, `Sale.createdAt`, and `Sale.paymentMethod` (`backend/src/main/java/uz/barakat/market/domain/Sale.java`). `PosService.checkout` writes `totalUzs` only after line discounts and the order-wide discount. For a **sale-date, as-of-calculation-time** brief over `[from, to)`:

```text
gross sales = SUM(Sale.totalUzs where createdAt >= from and createdAt < to)
net revenue as-of = gross sales - SUM(Sale.refundedTotalUzs for those same sales)
```

`SaleRepository.summaryBetween` implements this sale-date aggregate. `totalUzs` is already net of discounts; do not deduct `discountAmount` again. Payment method does not change revenue: `QARZGA` credit sales create a `Sale` and debt record, but no `Payment` (`PosService.checkout`), so excluding them would understate accrued sales.

There is no sale status or cancellation field. A persisted sale is a booked checkout; full refund is `fullyRefunded=true` plus `refundedTotalUzs`. `PosService.refund` increments a cumulative refund and overwrites `refundedAt` on every partial refund. `SaleRepository.findRefundedBetween` therefore cannot reconstruct every partial-refund amount by refund day. B2 must persist an **as-of snapshot** and return `UNSUPPORTED` for a transaction-day refund/revenue claim until immutable per-refund events exist.

## 2. Cost of goods sold (COGS)

The only defensible formula is:

```text
COGS = SUM((SaleItem.quantity - SaleItem.refundedQty) * SaleItem.costAtSaleUzs)
```

`PosService.checkout` writes `SaleItem.costAtSaleUzs` at checkout, converting USD product cost with the pinned shop rate. `V37__sale_item_cost_snapshot.sql` backfilled older rows from the product's then-current `purchase_price`; deleted-product rows can be null. The existing `ReportService.salesFor` falls back to current product cost, but B2 must never do that because it rewrites historical COGS. The schema cannot distinguish a V37 backfill from an original snapshot, so legacy history is `ESTIMATED`; a null cost is `INSUFFICIENT_DATA`.

## 3. Safe profit terminology

Only **Gross Profit Brief** is defensible when revenue and transaction-time COGS are verified:

```text
gross profit = net revenue as-of - verified COGS
gross margin = gross profit / net revenue as-of * 100, only when revenue > 0
```

Do not call this net profit. Expense completeness/immutability, taxes, payroll, depreciation, financing, payment fees, and refund-event accounting are not authoritative. `Operating Contribution` is at best `ESTIMATED`; **Net Profit is UNSUPPORTED**.

## 4. Expenses

`Expense` is shop-scoped and has a business `date`, `amount`, `paymentType`, and `currency` (`domain/Expense.java`). `ExpenseService` permits create, update, delete, and bulk import; it has no lifecycle/status or immutable posting. `QARZGA` expenses become debt and have zero cash/card splits (`PaymentSplits.resolve`). `HomeExpense` is separately mutable personal spending.

B2 excludes both from verified gross profit. A future operating-contribution mode may include only shop `Expense` rows in verified UZS and the selected period, visibly marked `ESTIMATED`; it must never imply cash-basis, accrual, or completeness certainty.

## 5. Currency, precision, and rounding

`Currency` contains `UZS` and `USD`. New POS checkout makes the sale header UZS-canonical: USD lines are converted using `Shop.usdRate`, with rate pinned on the sale/line (`PosService.checkout`; `Sale`, `SaleItem`, `Shop`). Monetary columns use `NUMERIC(15,2)` / JPA precision 15 scale 2. Final POS totals use `HALF_UP` at scale 2.

`V38__product_sale_currency.sql` documents legacy currency ambiguity and missing historical rate provenance. `MoneyConverter` may use a current/fallback rate for legacy reports; B2 must not use it for verified profit. Aggregate only amounts provably UZS-canonical with a pinned rate for every USD-origin line. Null/unknown currency, a missing required rate, or mixed values without immutable conversion is `INSUFFICIENT_DATA`. Sum with `BigDecimal` and round displayed final values only to scale 2, `HALF_UP`.

## 6. Time period and business day

`backend/src/main/resources/application.properties` configures Hibernate and JSON for `Asia/Tashkent`, but rows use `LocalDateTime` and services call `LocalDate.now()` / `date.atStartOfDay()` without a per-shop zone. `Shop` has no timezone field.

B2 must explicitly use `Asia/Tashkent`, define periods as start-inclusive/end-exclusive `[YYYY-MM-DDT00:00, next-day T00:00)`, and persist that zone with its evidence. “Today” means the calendar date in that zone. If the runtime zone cannot be verified as Asia/Tashkent, or a tenant needs another zone, return `INSUFFICIENT_DATA`. Comparison periods must use the same duration and boundaries.

## 7. Inventory and reorder inputs

`Product.quantity` is current integer on-hand (`domain/Product.java`). POS decrements/restores it; `TransferService` adjusts source/destination quantities, so completed transfers are included. There is no reserved-stock, supplier-lead-time, or safety-stock field. Negative stock is `INSUFFICIENT_DATA`.

`StockMovementRepository.sumSalesQtyByProduct` supplies gross units from `reason='SALE'` in `[from, to)`. Existing `ForecastService` uses 14/30-day recency weighting with fixed 7-day lead time and 14-day cover; these are visible legacy assumptions, not verified B2 facts. Returns are not netted in that velocity query, so a return-affected window requires an explicit future return-adjustment rule or `INSUFFICIENT_DATA`.

Purchase orders expose `DRAFT`, `ORDERED`, `PARTIAL`, `RECEIVED`, and `CANCELLED` (`PurchaseOrderStatus`) plus optional `expectedDate`, but no reliable supplier lead time or B2-ready incoming-stock commitment. B2 must exclude open POs from available/incoming stock. Units must match the product unit; cross-unit conversion is unsupported.

Minimum transparent future simulator assumptions: evidence-backed velocity window, owner-visible lead-time days, owner-visible safety-stock/coverage days, no reserved stock unless a source is added, and no incoming stock unless a separately evidence-backed receipt commitment exists.

## 8. Required outcome states

- `UNSUPPORTED`: transaction-day refund totals, net profit, mixed-currency totals without immutable conversion, cross-unit reorder conversion, and reserved/incoming-stock claims without a source.
- `INSUFFICIENT_DATA`: null/missing currency, missing required pinned rate, unknown timezone, negative on-hand stock, null transaction-time cost, missing product/unit, or a velocity period that cannot account for returns.
- `ESTIMATED`: V37-backfilled cost, legacy currency provenance, legacy ForecastService lead-time/safety assumptions, and any expense-based operating contribution.

Every future B2 result must persist its source period, calculation version, assumptions, outcome state, and immutable EvidenceItem references. Generic report/AI output is not evidence.

## B2 implementation correction

`V45` adds `SaleItem.costSnapshotProvenance`. Existing rows are explicitly `LEGACY_OR_UNKNOWN`; POS checkout now writes `TRANSACTION_TIME`. B2 can therefore classify legacy snapshot calculations as `ESTIMATED` without treating them as verified historical COGS, while a null snapshot remains `INSUFFICIENT_DATA` and never falls back to current product cost.

### B2 deterministic reorder correction

The implemented simulator does not use `StockMovementRepository.sumSalesQtyByProduct`, because it reports gross `SALE` movements and cannot net refunds. It uses `SaleRepository.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAscIdAsc` and same-product `SaleItem` rows instead: `netUnitsSold = SUM(quantity - refundedQty)` in the explicit Asia/Tashkent `[lookbackStart, lookbackEnd)` window. A negative or invalid returned quantity is `INSUFFICIENT_DATA`; no cross-unit conversion is attempted. Lead time, safety stock, and forecast horizon remain visible bounded scenario assumptions, so every reorder output is `ESTIMATED`.
