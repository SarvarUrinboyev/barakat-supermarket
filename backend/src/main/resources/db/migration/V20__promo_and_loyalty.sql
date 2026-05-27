-- =====================================================================
--  V20: Promo campaigns + loyalty card QR (Phase 6)
--
--  Promo campaigns:
--    A named, time-bounded discount the POS auto-applies when its
--    criteria match. Three kinds today (extensible):
--      PERCENT_OFF — flat % off entire sale (e.g. "Bayram -15%")
--      AMOUNT_OFF  — flat UZS off when subtotal >= threshold
--      BOGO        — buy N of one product, get M of same product free
--    The POS service walks active campaigns at checkout and picks the
--    single best discount for the cart. Multiple campaigns never stack.
--
--  Loyalty cards:
--    V18 already added customers.points_balance + customers.points_total_earned.
--    V20 adds a unique card-code (UUID printable as QR) so a customer can
--    scan their physical card at the POS instead of typing a phone.
-- =====================================================================

CREATE TABLE IF NOT EXISTS promo_campaigns (
    id           BIGSERIAL PRIMARY KEY,
    shop_id      BIGINT       NOT NULL,
    name         VARCHAR(180) NOT NULL,
    -- PERCENT_OFF / AMOUNT_OFF / BOGO
    kind         VARCHAR(20)  NOT NULL,
    -- PERCENT_OFF: value = 0..100 (percent)
    -- AMOUNT_OFF:  value = UZS off, requires min_subtotal_uzs
    -- BOGO:        value not used; buy_qty/get_qty drive it
    value_percent  NUMERIC(5,2) NOT NULL DEFAULT 0,
    value_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
    min_subtotal_uzs NUMERIC(15,2) NOT NULL DEFAULT 0,
    buy_qty      INT,
    get_qty      INT,
    -- Optional product target — BOGO and per-product %off scope here.
    product_id   BIGINT REFERENCES products(id) ON DELETE CASCADE,
    -- Optional category target — when product_id is null but this is set,
    -- the campaign applies to every product in that category.
    category_id  BIGINT REFERENCES categories(id) ON DELETE CASCADE,
    -- Bounded validity window. Use a far-future ends_at for "until manually disabled".
    starts_at    TIMESTAMP    NOT NULL,
    ends_at      TIMESTAMP    NOT NULL,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    -- Optional: only redeem on certain weekdays (bitmask, 0b1111111 = all).
    weekday_mask INT          NOT NULL DEFAULT 127,
    description  VARCHAR(500),
    created_at   TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_shop_active  ON promo_campaigns (shop_id, active);
CREATE INDEX IF NOT EXISTS idx_promo_dates        ON promo_campaigns (starts_at, ends_at);

-- Loyalty: QR-able card code (UUID-shaped, printable on a plastic card).
-- Note: index moved to V21 to work around an H2 2.2.224 metadata-rebuild
-- bug that throws NoClassDefFoundError when an ALTER + CREATE INDEX run
-- in the same migration script against legacy databases.
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS card_code VARCHAR(36);

-- Earn rules:
--   default = 1 point per 1000 UZS spent (configurable via property).
-- We don't add columns for this — the formula is in code so we can
-- tweak it without a migration.
