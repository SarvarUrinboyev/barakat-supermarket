# ADR 0001 — The GL ledger is USD-canonical; sales convert in at the sale's pinned rate

**Status:** Accepted (Gate C, 2026-07-11)
**Context:** per-product currency (UZS default, USD for dollar-received goods)

## Decision

The double-entry GL ledger (`journal_entries` / `journal_lines`, and the P&L /
balance-sheet / trial-balance built on them) is denominated in **one canonical
unit: USD**. Every posting converts its source amount to USD:

- Expenses / payments already converted via `MoneyConverter.toUsd(amount, currency)`.
- **Sales now convert too** (`LedgerPostingService.ledgerUsd`): a so'm-canonical
  sale is divided by the rate **pinned on it at sell time** (`sales.usd_rate_at_sale`),
  falling back to the live CBU rate for pure-so'm sales that pinned none, and to
  `MoneyConverter`'s hard fallback if the CBU rate is unavailable. Legacy sales
  (backfilled `currency = USD`) pass through unchanged.

One rate per journal entry ⇒ debits and credits stay balanced. Sales, COGS and
the cash accounts they share with expenses therefore all land in the same unit,
which is what makes the trial balance reconcile (verified by
`PosCurrencyIT.ledgerReconcilesAcrossUzsAndUsdSalesInOneUnit`).

## Why not a so'm-canonical ledger

The application stores operational money so'm-canonical after Gate C, but the
**frontend financial pages already treat every backend figure as USD and convert
for display** (`Management.jsx` `convertMoney(usdValue, 'USD', displayCurrency, rate)`).
Flipping the ledger to so'm would mean un-converting expenses/payments AND
reworking that frontend contract — a strictly larger change with no correctness
gain. Keeping USD-canonical preserves the existing display pipeline.

## Consequences

- No sale can fail to post for lack of a shop kurs: the rate-resolution chain
  (pinned → live → fallback) always yields a positive rate (Q2, tested by
  `PosCurrencyIT.noKursUzsSalePostsToLedgerWithoutSilentFailure`). A **USD line**
  still hard-requires a configured kurs at checkout (D6 block rule) — that guard
  is about pricing accuracy, not ledger posting.
- Pure-so'm sales are valued at the rate in effect **at posting time**, not
  pinned; report figures can drift slightly with the CBU rate between sell and
  view. Acceptable for a so'm-operating shop; if exact historical so'm valuation
  is ever required, pin the live rate on pure-so'm sales too (one-line change).
- **A future so'm-canonical ledger is a separate gate**, justified only if
  fiscal/reporting requirements demand native-so'm books.

## Alternatives rejected

- **Sales posted raw (pre-Gate-C behavior):** overstated revenue ≈ ×kurs once
  sales became so'm-canonical — the AM-6 seam bug this ADR closes.
- **Block every sale until a kurs is set:** punishes the common all-so'm shop
  for no benefit; the live/fallback rate already values so'm sales correctly.
