-- ====================================================================
--  Suppliers (Yetkazib beruvchilar) — contacts we receive goods from.
--  Balance/debt is computed from the payment journal where
--  category = 'SUPPLIER' and party = supplier.name.
-- ====================================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(180) NOT NULL,
    phone      VARCHAR(40),
    address    VARCHAR(400),
    note       VARCHAR(1000),
    created_at TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers (name);
