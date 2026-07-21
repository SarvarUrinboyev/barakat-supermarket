# ProofTwin AI B2 Deterministic API Contract

## Scope and source contract

B2 has no provider, chat, frontend, purchase-order, inventory, supplier,
payment, receiving, delivery, or pricing side effect. Every generated result
creates an `AnalysisRun` and immutable `EvidenceItem` records using
`B1_CANONICAL_V1`.

| Input | Source | B2 treatment |
|---|---|---|
| Booked sale | `Sale.createdAt`, `totalUzs`, `refundedTotalUzs`, `paymentMethod` | Every persisted `Sale` is booked; there is no cancellation/status field. `QARZGA` is included. |
| COGS | `SaleItem.quantity`, `refundedQty`, `costAtSaleUzs`, `costSnapshotProvenance` | `SUM((quantity-refundedQty)*costAtSaleUzs)` only. No current product-cost fallback. |
| Currency | `Sale.currency`, `SaleItem.currency`, `SaleItem.usdRateAtSale` | Only UZS-canonical sale aggregates with required pinned USD-line rate are aggregateable. |
| Inventory/velocity | `Product.quantity`, same-product `SaleItem` net unit sales | No reserved stock, incoming PO, supplier delivery, or cross-unit conversion claim. |

`V45` marks historical cost snapshots `LEGACY_OR_UNKNOWN`; only a POS checkout
written after that migration records `TRANSACTION_TIME`. Legacy cost output is
`ESTIMATED`, missing cost is `INSUFFICIENT_DATA`.

## Endpoints

| Method and route | Permission | Behavior |
|---|---|---|
| `POST /api/savdograph/gross-profit-briefs` | `SAVDOGRAPH:WRITE` | Creates a deterministic Daily Gross Profit Brief for explicit `periodStart` / `periodEnd`. |
| `GET /api/savdograph/gross-profit-briefs/{analysisRunId}` | `SAVDOGRAPH:READ` | Returns the immutable stored brief snapshot/evidence references. |
| `POST /api/savdograph/reorder-simulations` | `SAVDOGRAPH:WRITE` | Creates a read-only, product-specific scenario simulation. |
| `GET /api/savdograph/reorder-simulations/{analysisRunId}` | `SAVDOGRAPH:READ` | Returns the immutable stored simulation snapshot/evidence references. |

All endpoints require the active `X-Shop-Id`; tenant filters and direct-ID
guards return `404` for another shop's analysis, evidence, or product. Invalid
periods, reversed endpoints, a brief over 31 days, a reorder lookback over 90
days, and lead/safety/horizon values outside `0..60`, `0..90`, and `1..180`
respectively return `400`.

## Formulas and classification

The explicit timezone is `Asia/Tashkent`. Database boundaries are
`[periodStartT00:00, periodEndT00:00)` and never derive from the JVM default
timezone. Displayed money and percentages use `BigDecimal` `HALF_UP`, scale 2.

```text
revenueUzs = SUM(totalUzs) - SUM(refundedTotalUzs)
grossCogsUzs = SUM((quantity - refundedQty) * costAtSaleUzs)
grossProfitUzs = revenueUzs - grossCogsUzs
grossMarginPercent = grossProfitUzs / revenueUzs * 100, only if revenueUzs > 0

velocity = netUnitsSold / explicitLookbackDays
scenarioTarget = velocity * (leadTimeDays + safetyStockDays + forecastHorizonDays)
reorderQuantity = max(0, ceil(scenarioTarget - currentOnHand))
```

- `VERIFIED`: complete UZS/rate provenance and transaction-time COGS.
- `ESTIMATED`: legacy cost provenance or any reorder output, because lead time,
  safety stock, and horizon are visible scenario assumptions.
- `INSUFFICIENT_DATA`: missing cost/currency/rate/unit, invalid refund quantity,
  negative stock, or unsafe scenario quantity. Affected aggregate is absent,
  never replaced with current product cost.
- `UNSUPPORTED`: no B2 endpoint makes net-profit, transaction-day refund,
  reserved-stock, incoming-stock, or cross-unit claim.

An empty verified period returns zero revenue/COGS/gross profit and an explicit
`UNAVAILABLE_ZERO_REVENUE` gross-margin state. A negative gross-profit value is
valid and remains visible. Tied-up capital is explicitly unavailable because
current on-hand inventory lacks immutable lot-cost provenance.

## Evidence and side-effect boundary

The brief writes evidence for period/timezone, revenue, refunded revenue,
COGS, gross profit, gross margin, source counts, and classification. The
simulator writes period/timezone, current stock, net sales, velocity, reorder
quantity, coverage before/after, stockout/overstock risk, unavailable tied-up
capital, and classification. Each response maps every numerical section to its
immutable evidence ID.

Simulations do not create `PurchaseOrder`, `StockMovement`, payment, supplier,
delivery, receiving, notification, inventory, or price records. B2 deliberately
does not convert a simulation to a B1 `DecisionProposal`; that future feature
must accept only canonical B2 reorder evidence and preserve the B1 owner-only,
pending-then-DRAFT approval path.

## B3 scope

B3 may add an evidence-validated simulation-to-pending-proposal bridge and
presentation work only after PostgreSQL trigger runtime parity is proven on a
disposable local database. It must not weaken classification, canonical-hash,
tenant, owner-decision, or no-side-effect boundaries.
