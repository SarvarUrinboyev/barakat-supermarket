-- Phase 4.5: phone-number column for SMS code login.
-- Stored as text (E.164 with leading "+" recommended, but we don't
-- enforce a format here — normalisation lives in the service layer).
-- Unique-when-non-null so two users can't share a phone.

ALTER TABLE app_users ADD COLUMN phone VARCHAR(20);

ALTER TABLE app_users ADD CONSTRAINT app_users_phone_unique UNIQUE (phone);
