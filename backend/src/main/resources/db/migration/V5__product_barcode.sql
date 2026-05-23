-- ====================================================================
--  Barakat SuperMarket - product barcode (V5)
--  Each product can carry a barcode that a USB scanner reads.
-- ====================================================================

ALTER TABLE products ADD COLUMN barcode VARCHAR(64);

CREATE INDEX idx_products_barcode ON products(barcode);
