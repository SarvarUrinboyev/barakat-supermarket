-- =====================================================================
--  V5: per-account white-label brand fields (Phase 4.6 / H)
--
--  Lets each customer rebrand their SavdoPRO install — own logo, own
--  primary / secondary colour, custom display name on the title bar
--  and receipts. All nullable so existing accounts keep the SavdoPRO
--  default; the desktop applies these via CSS variables on login.
-- =====================================================================

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS brand_name             VARCHAR(120);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS brand_color_primary    VARCHAR(20);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS brand_color_secondary  VARCHAR(20);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS brand_logo_url         VARCHAR(500);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS brand_footer_note      VARCHAR(300);
