-- ====================================================================
--  Barakat SuperMarket - warehouse / inventory (V2)
--  Stock of goods for a phone & electronics shop.
-- ====================================================================

CREATE TABLE products (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(255)  NOT NULL,
    purchase_price NUMERIC(15,2) NOT NULL DEFAULT 0,   -- kelish narxi
    sale_price     NUMERIC(15,2) NOT NULL DEFAULT 0,   -- sotilish narxi
    quantity       INTEGER       NOT NULL DEFAULT 0,   -- qoldiq soni
    note           VARCHAR(500),
    created_at     TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_name ON products(name);
