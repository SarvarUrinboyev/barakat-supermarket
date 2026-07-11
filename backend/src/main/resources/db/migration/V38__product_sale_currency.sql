-- =====================================================================
--  V38: per-product currency + per-sale exchange-rate pinning (Gate C)
--
--  Until now every money value in the app was USD-canonical (see
--  MoneyConverter / format.js). Uzbek shops that received goods in so'm
--  had those som values converted to USD on entry (ProductEditor /
--  ScanModal), while bulk-imported catalogues were stored as raw so'm
--  numbers inside the USD-semantic *_uzs columns. Gate C makes currency
--  an explicit per-product attribute so both populations render honestly.
--
--  Direction (locked by Sarvar): default display currency is so'm (UZS);
--  a product received in USD carries USD everywhere including the POS.
--
--  BACKFILL DISCRIMINATOR (AM-3) — deterministic, evidence-based:
--    * A product's opening-stock movement note tells us how it was born:
--        "Boshlang'ich qoldiq"  -> created individually (form / scanner)
--        "Import (fayldan)"     -> UI bulk import (POST /products/import)
--    * Individually-created products are the ones whose prices were typed
--      as dollars (the som path converted on entry) -> USD.
--    * Everything else (UI-imported, or no opening movement) -> UZS
--      (the column default), matching the som-valued imported catalogues.
--
--  KNOWN LIMIT — the "P1" script import (imports/warehouse_import.py) was
--  written through POST /api/products, so its opening movements are also
--  noted "Boshlang'ich qoldiq" and are schema-indistinguishable from a
--  hand-created product. This backfill therefore labels P1 rows USD too.
--  P1 lives in its own non-operational shop and is handled OUT OF BAND by
--  the reversible ops runbook docs/ops/gate-c-p1-cleanup.md (dispose if no
--  sale references it, else a shop-keyed UZS relabel), run on prod once the
--  shop is confirmed. No prod shop id is hard-coded into this migration so
--  it stays correct for every fresh / test / other-tenant database.
-- =====================================================================

-- --- products --------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'UZS';

-- Flip individually-created products (dollar-entered) to USD. Match on the
-- opening-movement note only; it is set exclusively with reason INITIAL.
UPDATE products SET currency = 'USD'
WHERE id IN (
        SELECT sm.product_id FROM stock_movements sm
        WHERE sm.note = 'Boshlang''ich qoldiq' AND sm.product_id IS NOT NULL
    )
  AND id NOT IN (
        SELECT sm2.product_id FROM stock_movements sm2
        WHERE sm2.note = 'Import (fayldan)' AND sm2.product_id IS NOT NULL
    );

-- --- shops: per-tenant USD->UZS rate (kurs), NULL = not configured ----
-- POS blocks checkout of a USD line when this is null (the system never
-- guesses a rate). Lives on shops, matching the V16 register-profile
-- pattern (there is no separate settings/config table).
ALTER TABLE shops ADD COLUMN IF NOT EXISTS usd_rate NUMERIC(12,2);

-- --- sales + sale_items: currency + the rate pinned at sell time ------
-- Existing rows predate imports being sellable and are dollar-valued, so
-- they default USD; the per-line relabel below corrects any line that
-- references a now-UZS product. usd_rate_at_sale stays NULL for historical
-- rows (no rate was pinned then) and for pure-UZS sales (no conversion).
ALTER TABLE sales      ADD COLUMN IF NOT EXISTS currency         VARCHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE sales      ADD COLUMN IF NOT EXISTS usd_rate_at_sale NUMERIC(12,2);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS currency         VARCHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS usd_rate_at_sale NUMERIC(12,2);

-- AM-2: a historical sale line's currency = its product's population
-- currency. Lines whose product was deleted (product_id NULL) keep the USD
-- default (their era). Verify volume on prod via the ops runbook before
-- trusting relabeled past reports.
UPDATE sale_items SET currency = 'UZS'
WHERE product_id IN (SELECT id FROM products WHERE currency = 'UZS');

-- A sale header is UZS when it has at least one UZS line (mixed carts are
-- stored so'm-canonical going forward); otherwise it stays USD.
UPDATE sales SET currency = 'UZS'
WHERE id IN (SELECT sale_id FROM sale_items WHERE currency = 'UZS');
