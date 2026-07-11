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

## Rate resolution, persistence and fallback policy (AM-7/8)

Every sale posting resolves ONE rate via a fixed chain and **records both the
rate and its source** on the journal entry (`gl_journal_entry.usd_rate`,
`rate_source`), so the conversion is reproducible and auditable:

1. **PINNED** — the kurs frozen on the sale at sell time (`sales.usd_rate_at_sale`).
   Used whenever present, so a past sale's booked profit never drifts.
2. **CBU** — the live Central-Bank rate, when a sale pinned none (pure-so'm sale)
   and the feed is reachable.
3. **FALLBACK** — a documented constant (`MoneyConverter.FALLBACK_USD_UZS = 12700`)
   used ONLY when the CBU feed is unreachable. Such an entry is **flagged**
   `rate_source = FALLBACK` and surfaces on a re-rating worklist
   (`JournalEntryRepository.findByRateSource(FALLBACK)`, indexed) — a posting made
   at the offline constant is treated as provisional inaccuracy to be corrected,
   never silently trusted. Posting still succeeds (no silent *failure*), but it
   is not silently *accurate* either — the flag is the audit hook.

`MoneyConverter.resolveRate()` returns `{rate, source}`; legacy USD-valued sales
resolve to null (no conversion, no rate recorded). Tested by
`MoneyConverterTest` (CBU vs FALLBACK tagging) and `LedgerRateProvenanceIT`
(PINNED/CBU/FALLBACK stamped on the entry; FALLBACK hits the worklist).

## Consequences

- No sale can fail to post for lack of a shop kurs: the rate-resolution chain
  (pinned → live → fallback) always yields a positive rate (Q2, tested by
  `PosCurrencyIT.noKursUzsSalePostsToLedgerWithoutSilentFailure`). A **USD line**
  still hard-requires a configured kurs at checkout (D6 block rule) — that guard
  is about pricing accuracy, not ledger posting.
- Fallback-rated entries are never silently final: they carry the `FALLBACK` tag
  and appear on the re-rating worklist until an operator corrects them.
- Pure-so'm sales are valued at the rate in effect **at posting time**, not
  pinned; report figures can drift slightly with the CBU rate between sell and
  view. Acceptable for a so'm-operating shop; if exact historical so'm valuation
  is ever required, pin the live rate on pure-so'm sales too (one-line change).
- **A future so'm-canonical ledger is a separate gate**, justified only if
  fiscal/reporting requirements demand native-so'm books.

## Customer credit ledger — per-currency, denominated at the sale's unit (Gate C Q3)

`customer_transactions` is tagged with a `currency` (V40) and a customer's
balance is summed PER CURRENCY, never merged — a customer can owe "500 000 so'm
+ $200" and the two buckets are reported separately (`CustomerResponse.balanceUzs`
/ `balanceUsd`). **Interim denomination rule:** a QARZGA credit sale's debt is
denominated in the SALE's canonical unit (so'm), even when the cart contains USD
items — so the debt never floats with the kurs. Per-item / USD debt
denomination, and cross-currency settlement (which bucket a payment pays down,
payoff at kurs), are **Gate D** policy. Existing rows backfill to USD (the
pre-Gate-C unit); prod rows the old code wrote as so'm since import day are
corrected out-of-band by the runbook (EXT-1). Proven by
`CustomerCurrencyBalanceIT` (reproduce the merged "$63 550", then the split).

## Alternatives rejected

- **Sales posted raw (pre-Gate-C behavior):** overstated revenue ≈ ×kurs once
  sales became so'm-canonical — the AM-6 seam bug this ADR closes.
- **Block every sale until a kurs is set:** punishes the common all-so'm shop
  for no benefit; the live/fallback rate already values so'm sales correctly.
