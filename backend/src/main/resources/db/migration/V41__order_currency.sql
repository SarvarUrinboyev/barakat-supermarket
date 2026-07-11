-- =====================================================================
--  V41: per-order currency (Gate C 1a — record-DTO currency)
--
--  A purchase order's `amount` is money owed to a supplier. Tag it with a
--  currency so the Orders screen renders "$" vs "so'm" honestly instead of a
--  hardcoded dollar sign. Existing rows -> UZS (the default going forward);
--  set USD explicitly on the create form for dollar-priced orders.
-- =====================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'UZS';
