-- =====================================================================
--  V4: TOTP 2FA for super-admin (Phase 4.5)
--
--  totp_secret  — Base32-encoded shared secret (160 bits / 32 chars)
--  totp_enabled — false until the user confirms the first code from
--                 their authenticator app; lets us store an unconfirmed
--                 secret without yet enforcing 2FA on login
-- =====================================================================

ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS totp_secret  VARCHAR(64);
ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
