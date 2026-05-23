-- ====================================================================
--  Barakat SuperMarket - per-record currency (V7)
--  Expenses are usually entered in UZS, phone sales in USD. Each money
--  record now remembers its own currency; USD stays the canonical unit
--  used for any cross-currency total. Existing rows keep 'USD'.
-- ====================================================================

ALTER TABLE expenses         ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE home_expenses    ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE management_costs ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE payments         ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD';
