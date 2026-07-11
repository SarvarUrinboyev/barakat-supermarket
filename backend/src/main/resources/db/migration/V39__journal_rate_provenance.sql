-- =====================================================================
--  V39: record the exchange rate + its source on every GL entry (Gate C AM-7/8)
--
--  Sales post to the USD-canonical ledger by converting so'm at a rate
--  resolved through a chain (pinned-at-sale -> live CBU -> last-resort
--  fallback constant). A posting whose conversion rate is not recorded is
--  not reproducible, and one made with the offline fallback is silent
--  inaccuracy. Persist both so every conversion can be audited and any
--  fallback-tainted entry can be found and re-rated.
--
--    usd_rate    - the USD->UZS rate actually used (NULL for entries that
--                  involved no conversion, e.g. legacy USD-valued sales).
--    rate_source - PINNED (rate frozen on the sale) / CBU (live feed) /
--                  FALLBACK (feed unreachable -> flagged for re-rating).
-- =====================================================================

ALTER TABLE gl_journal_entry ADD COLUMN IF NOT EXISTS usd_rate    NUMERIC(12,2);
ALTER TABLE gl_journal_entry ADD COLUMN IF NOT EXISTS rate_source VARCHAR(10);

-- Find fallback-tainted postings quickly (the AM-8 re-rating worklist).
CREATE INDEX IF NOT EXISTS idx_gl_entry_rate_source
    ON gl_journal_entry (rate_source);
