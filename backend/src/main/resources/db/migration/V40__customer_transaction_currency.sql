-- =====================================================================
--  V40: per-currency customer ledger (Gate C Q3-seed)
--
--  customer_transactions.amount was a single implicit unit (USD, pre-Gate-C).
--  A so'm-canonical QARZGA credit sale writes a so'm number into it, so a
--  customer's running balance (sum of these rows) silently mixes USD-era and
--  so'm-era amounts. Tag each row with its currency so the balance is summed
--  PER CURRENCY ("500 000 so'm + $200"), never merged.
--
--  Backfill: existing rows are the pre-Gate-C canonical unit -> USD. This is
--  correct for every fresh / test DB and for pre-import history. Any prod rows
--  written as so'm by the OLD code since import day (QARZGA sales of imported
--  products, EXT-1) are corrected out-of-band by the ops runbook, keyed on the
--  linked sale's product population -- not guessable in a generic migration.
-- =====================================================================

ALTER TABLE customer_transactions
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';
