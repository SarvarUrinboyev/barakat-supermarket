-- ====================================================================
--  SavdoPRO - product tax fields (V9)
--  IKPU/MXIK catalogue code, VAT (QQS) rate and unit of measure.
--  Foundation for the optional tax-service / Didox e-invoice integration.
--  All fields are optional; nothing is transmitted anywhere until a shop
--  explicitly enables the integration with its own credentials.
-- ====================================================================

ALTER TABLE products ADD COLUMN mxik_code VARCHAR(30);
ALTER TABLE products ADD COLUMN vat_rate  NUMERIC(5,2);
ALTER TABLE products ADD COLUMN unit      VARCHAR(24) NOT NULL DEFAULT 'dona';
