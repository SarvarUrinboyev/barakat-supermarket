-- =====================================================================
-- V6: Per-account module visibility (Sidebar filter)
--
-- Super-admin can enable/disable individual modules (sidebar entries)
-- on a per-account basis. Stored as a comma-separated list of module
-- keys (e.g. "dashboard,warehouse,customers,reports"). NULL = all
-- modules visible (default for legacy accounts).
--
-- The set of known keys is owned by the frontend Sidebar.jsx; the
-- backend never validates membership so future modules don't require
-- a migration. The PATCH endpoint trims/de-dupes the value before save.
-- =====================================================================

ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS enabled_modules VARCHAR(2000);
