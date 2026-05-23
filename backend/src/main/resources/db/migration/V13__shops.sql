-- ====================================================================
--  Shops (Phase 1C-1: multi-shop foundation)
--
--  An "account" is the paying tenant; each account has one or more
--  shops. The first shop of every account is marked is_main = TRUE and
--  acts as the consolidated rollup view (Phase 1C-2 will scope data by
--  shop_id and the main shop will aggregate across siblings).
-- ====================================================================

CREATE TABLE IF NOT EXISTS shops (
    id            BIGSERIAL PRIMARY KEY,
    account_id    BIGINT       NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name          VARCHAR(180) NOT NULL,
    is_main       BOOLEAN      NOT NULL DEFAULT FALSE,
    address       VARCHAR(300),
    contact_phone VARCHAR(40),
    created_at    TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shops_account ON shops (account_id);

-- For every existing account, create one "Asosiy do'kon" (Main shop)
-- so the data set is never orphaned.
INSERT INTO shops (account_id, name, is_main)
SELECT a.id, 'Asosiy do''kon', TRUE
  FROM accounts a
 WHERE NOT EXISTS (
       SELECT 1 FROM shops s WHERE s.account_id = a.id AND s.is_main = TRUE);

-- Default shop for a user (which shop the desktop opens on login).
ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS default_shop_id BIGINT
        REFERENCES shops(id) ON DELETE SET NULL;

-- Point every existing user at the main shop of their account.
UPDATE app_users u
   SET default_shop_id = (
       SELECT s.id FROM shops s
        WHERE s.account_id = u.account_id AND s.is_main = TRUE
        LIMIT 1)
 WHERE default_shop_id IS NULL;
