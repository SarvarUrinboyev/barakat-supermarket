-- ====================================================================
--  Barakat SuperMarket - initial database schema (V1)
--  Column names follow Barakat_SuperMarket_Hujjat.docx section 5.1 so
--  the documented manual SQL queries (section 5.2) keep working.
-- ====================================================================

-- Working sessions: one open/close cycle per business day.
CREATE TABLE shifts (
    id         BIGSERIAL PRIMARY KEY,
    opened_at  TIMESTAMP   NOT NULL,
    closed_at  TIMESTAMP,
    opened_by  VARCHAR(120),
    status     VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP   NOT NULL DEFAULT now()
);

-- Morning cash balance brought in by the owner, one row per date.
CREATE TABLE day_balance (
    id            BIGSERIAL PRIMARY KEY,
    date          DATE          NOT NULL UNIQUE,
    starting_cash NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMP     NOT NULL DEFAULT now()
);

-- Supermarket expenses.
CREATE TABLE expenses (
    id           BIGSERIAL PRIMARY KEY,
    date         DATE          NOT NULL,
    name         VARCHAR(255)  NOT NULL,
    amount       NUMERIC(15,2) NOT NULL,
    payment_type VARCHAR(20)   NOT NULL,
    cash_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,   -- KASSA  (cash register / till)
    naqd_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,   -- NAQD   (physical cash)
    card_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,   -- KARTA  (bank card)
    note         VARCHAR(500),
    created_at   TIMESTAMP     NOT NULL DEFAULT now()
);

-- Home / personal expenses, tracked separately from the market.
CREATE TABLE home_expenses (
    id           BIGSERIAL PRIMARY KEY,
    date         DATE          NOT NULL,
    name         VARCHAR(255)  NOT NULL,
    amount       NUMERIC(15,2) NOT NULL,
    payment_type VARCHAR(20)   NOT NULL,
    cash_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
    naqd_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
    card_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
    note         VARCHAR(500),
    created_at   TIMESTAMP     NOT NULL DEFAULT now()
);

-- Incoming goods orders expected from suppliers.
CREATE TABLE orders (
    id            BIGSERIAL PRIMARY KEY,
    order_date    DATE          NOT NULL,
    delivery_date DATE          NOT NULL,
    name          VARCHAR(255)  NOT NULL,
    supplier      VARCHAR(255),
    amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
    completed     BOOLEAN       NOT NULL DEFAULT FALSE,
    completed_at  TIMESTAMP,
    note          VARCHAR(500),
    created_at    TIMESTAMP     NOT NULL DEFAULT now()
);

-- "My debts": amounts the owner owes to suppliers.
CREATE TABLE debtors (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE          NOT NULL,
    name            VARCHAR(255)  NOT NULL,
    product_name    VARCHAR(255),
    original_amount NUMERIC(15,2) NOT NULL,
    paid_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
    paid            BOOLEAN       NOT NULL DEFAULT FALSE,
    note            VARCHAR(500),
    created_at      TIMESTAMP     NOT NULL DEFAULT now()
);

-- "Debts owed to us": amounts customers owe the owner.
CREATE TABLE customer_debts (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE          NOT NULL,
    customer_name   VARCHAR(255)  NOT NULL,
    product_name    VARCHAR(255),
    original_amount NUMERIC(15,2) NOT NULL,
    paid_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
    paid            BOOLEAN       NOT NULL DEFAULT FALSE,
    note            VARCHAR(500),
    created_at      TIMESTAMP     NOT NULL DEFAULT now()
);

-- History of payments against, and increases of, a debt.
CREATE TABLE debt_payments (
    id               BIGSERIAL PRIMARY KEY,
    debtor_id        BIGINT REFERENCES debtors(id) ON DELETE CASCADE,
    customer_debt_id BIGINT REFERENCES customer_debts(id) ON DELETE CASCADE,
    payment_date     DATE          NOT NULL,
    amount           NUMERIC(15,2) NOT NULL,
    entry_type       VARCHAR(20)   NOT NULL DEFAULT 'PAYMENT',  -- PAYMENT | INCREASE
    note             VARCHAR(500),
    created_at       TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT debt_payment_target CHECK (
        (debtor_id IS NOT NULL AND customer_debt_id IS NULL) OR
        (debtor_id IS NULL AND customer_debt_id IS NOT NULL)
    )
);

-- Daily card-terminal totals (Humo / UzCard payment systems).
CREATE TABLE terminal_balances (
    id            BIGSERIAL PRIMARY KEY,
    date          DATE          NOT NULL UNIQUE,
    humo_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
    uzcard_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMP     NOT NULL DEFAULT now()
);

-- Indexes supporting the common date-range and status lookups.
CREATE INDEX idx_expenses_date         ON expenses(date);
CREATE INDEX idx_home_expenses_date    ON home_expenses(date);
CREATE INDEX idx_orders_delivery_date  ON orders(delivery_date);
CREATE INDEX idx_orders_completed      ON orders(completed);
CREATE INDEX idx_debtors_paid          ON debtors(paid);
CREATE INDEX idx_customer_debts_paid   ON customer_debts(paid);
CREATE INDEX idx_debt_payments_debtor  ON debt_payments(debtor_id);
CREATE INDEX idx_debt_payments_custdebt ON debt_payments(customer_debt_id);
CREATE INDEX idx_shifts_status         ON shifts(status);
