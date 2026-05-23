-- ====================================================================
--  Barakat SuperMarket - replace product SKU with IMEI fields (V4)
--  Phones are tracked by IMEI; the generic SKU column is removed.
-- ====================================================================

-- Dropping the column also drops its single-column index automatically.
ALTER TABLE products DROP COLUMN sku;

ALTER TABLE products ADD COLUMN imei1 VARCHAR(40);
ALTER TABLE products ADD COLUMN imei2 VARCHAR(40);
