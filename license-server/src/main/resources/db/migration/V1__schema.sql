-- =====================================================================
--  License Server schema v1
--
--  Owns every account, user and subscription centrally. Customer
--  desktops never store credentials.
-- =====================================================================

CREATE TABLE IF NOT EXISTS accounts (
    id                   BIGSERIAL PRIMARY KEY,
    name                 VARCHAR(180) NOT NULL,
    contact_phone        VARCHAR(40),
    contact_note         VARCHAR(500),
    subscription_expires DATE,
    blocked              BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_users (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(80)  NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,
    full_name     VARCHAR(180),
    role          VARCHAR(30)  NOT NULL,
    account_id    BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
    last_login_at TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_users_account ON app_users (account_id);

-- Bootstrap the super-admin tenant. AdminBootstrap creates the first
-- super-admin user inside this account on first launch.
INSERT INTO accounts (name, contact_phone)
SELECT 'SavdoPRO Super Admin', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM accounts WHERE LOWER(name) = LOWER('SavdoPRO Super Admin')
);
