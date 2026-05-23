-- ====================================================================
--  Barakat SuperMarket - customers, management & payments (V6)
--  Adds the CRM (customers + ledger), the management cost entries and
--  the payment journal ("To'lovlar jurnali").
-- ====================================================================

-- Customers ("Mijozlar"): the people the shop sells to.
CREATE TABLE customers (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    phone      VARCHAR(60),
    address    VARCHAR(500),
    note       VARCHAR(500),
    created_at TIMESTAMP    NOT NULL DEFAULT now()
);

-- Customer ledger: goods handed over (GOODS) and money received (PAYMENT).
-- balance = sum(GOODS) - sum(PAYMENT); a positive balance means the
-- customer owes the shop, a negative balance is credit held for them.
CREATE TABLE customer_transactions (
    id          BIGSERIAL PRIMARY KEY,
    customer_id BIGINT        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    date        DATE          NOT NULL,
    type        VARCHAR(20)   NOT NULL,            -- GOODS | PAYMENT
    description VARCHAR(255),
    amount      NUMERIC(15,2) NOT NULL,
    note        VARCHAR(500),
    created_at  TIMESTAMP     NOT NULL DEFAULT now()
);

-- Management cost entries: worker salaries, taxes and other costs.
CREATE TABLE management_costs (
    id         BIGSERIAL PRIMARY KEY,
    date       DATE          NOT NULL,
    type       VARCHAR(20)   NOT NULL,             -- SALARY | TAX | OTHER
    name       VARCHAR(255)  NOT NULL,
    amount     NUMERIC(15,2) NOT NULL,
    note       VARCHAR(500),
    created_at TIMESTAMP     NOT NULL DEFAULT now()
);

-- Payment journal ("To'lovlar jurnali"): every money movement.
CREATE TABLE payments (
    id         BIGSERIAL PRIMARY KEY,
    date       DATE          NOT NULL,
    direction  VARCHAR(10)   NOT NULL,             -- INCOMING | OUTGOING
    category   VARCHAR(20)   NOT NULL,             -- CUSTOMER | SUPPLIER | SALARY | TAX | OTHER
    party      VARCHAR(255),
    amount     NUMERIC(15,2) NOT NULL,
    method     VARCHAR(20)   NOT NULL,             -- NAQD | KASSA | KARTA
    note       VARCHAR(500),
    created_at TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_tx_customer  ON customer_transactions(customer_id);
CREATE INDEX idx_customer_tx_date      ON customer_transactions(date);
CREATE INDEX idx_management_costs_date ON management_costs(date);
CREATE INDEX idx_payments_date         ON payments(date);
