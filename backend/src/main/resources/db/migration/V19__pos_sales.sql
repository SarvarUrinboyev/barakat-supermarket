-- =====================================================================
--  V19: POS sales + line items (Phase 5)
--
--  Until now a "sale" was a single Payment row + N StockMovement rows
--  loosely correlated by timestamp. This works for the journal but
--  makes receipts impossible to reproduce, kills proper refunds and
--  blocks per-line discounts.
--
--  V19 introduces an explicit Sale aggregate that bundles:
--    • the cart (sale_items snapshotted at sell time)
--    • the originating payment (link, not duplicate)
--    • totals + applied discounts
--    • refund state (full / partial / none)
--
--  Backwards-compatible: existing Payments are untouched. A Sale is
--  created in addition to the Payment by the POS service.
-- =====================================================================

CREATE TABLE IF NOT EXISTS sales (
    id              BIGSERIAL PRIMARY KEY,
    shop_id         BIGINT       NOT NULL,
    -- The Payment journal row that booked this sale's net total. Null
    -- only when the sale is fully on credit (qarz) and no payment was
    -- collected at sell time.
    payment_id      BIGINT REFERENCES payments(id) ON DELETE SET NULL,
    customer_id     BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    -- Subtotal = SUM(qty * unit_price) before any discount.
    subtotal_uzs    NUMERIC(15,2) NOT NULL,
    -- Discount applied to the whole sale (in addition to any per-line discount).
    discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    -- Final net charged to the customer = subtotal - line_discounts - sale_discount.
    total_uzs       NUMERIC(15,2) NOT NULL,
    -- "NAQD" / "KARTA" / "QARZ" — matches PaymentType enum strings.
    payment_method  VARCHAR(20)  NOT NULL,
    -- Free-text note shown on the receipt (e.g. "buyurtma #42 uchun").
    note            VARCHAR(500),
    -- Refund tracking. fully_refunded gates double-refund attempts; the
    -- refunded_total / refunded_at give the audit trail.
    refunded_total_uzs NUMERIC(15,2) NOT NULL DEFAULT 0,
    fully_refunded  BOOLEAN      NOT NULL DEFAULT FALSE,
    refunded_at     TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_shop      ON sales (shop_id);
CREATE INDEX IF NOT EXISTS idx_sales_created   ON sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_payment   ON sales (payment_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer  ON sales (customer_id);

CREATE TABLE IF NOT EXISTS sale_items (
    id              BIGSERIAL PRIMARY KEY,
    sale_id         BIGINT       NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    -- Product link CAN go null after the product is deleted; the
    -- denormalised name/sku below keeps the receipt readable.
    product_id      BIGINT REFERENCES products(id) ON DELETE SET NULL,
    product_name    VARCHAR(200) NOT NULL,
    product_sku     VARCHAR(80),
    quantity        INT          NOT NULL,
    unit_price_uzs  NUMERIC(15,2) NOT NULL,
    line_discount_uzs NUMERIC(15,2) NOT NULL DEFAULT 0,
    -- (qty * unit_price) - line_discount, denormalised so receipts
    -- don't have to recompute.
    line_total_uzs  NUMERIC(15,2) NOT NULL,
    -- How much of this line has been refunded (qty). Defaults to 0.
    refunded_qty    INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale    ON sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items (product_id);
