-- =====================================================================
--  V21: Unique index for the loyalty card code (split from V20 to
--  avoid an H2 2.2.224 NoClassDefFoundError when an ALTER + CREATE INDEX
--  share a single migration script on legacy databases).
-- =====================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_card_code
    ON customers (card_code);
