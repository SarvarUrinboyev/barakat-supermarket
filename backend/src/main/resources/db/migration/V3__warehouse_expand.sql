-- ====================================================================
--  Barakat SuperMarket - warehouse expansion (V3)
--  Categories, stock-movement history and richer product fields.
-- ====================================================================

CREATE TABLE categories (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMP    NOT NULL DEFAULT now()
);

ALTER TABLE products ADD COLUMN sku                 VARCHAR(80);
ALTER TABLE products ADD COLUMN category_id         BIGINT REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN description         VARCHAR(2000);
ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 0;

-- History of every stock-quantity change.
CREATE TABLE stock_movements (
    id                 BIGSERIAL PRIMARY KEY,
    product_id         BIGINT      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    delta              INTEGER     NOT NULL,
    resulting_quantity INTEGER     NOT NULL,
    reason             VARCHAR(40) NOT NULL,
    note               VARCHAR(500),
    created_at         TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_sku            ON products(sku);
CREATE INDEX idx_products_category       ON products(category_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
