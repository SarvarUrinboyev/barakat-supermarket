-- Seed three commonly-used product categories so the warehouse dropdown is
-- not empty on a fresh install. INSERT...SELECT WHERE NOT EXISTS keeps the
-- migration idempotent if the user already created the same category.

INSERT INTO categories (name)
SELECT 'Smartfonlar'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = LOWER('Smartfonlar'));

INSERT INTO categories (name)
SELECT 'Noutbuklar'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = LOWER('Noutbuklar'));

INSERT INTO categories (name)
SELECT 'Elektronika'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = LOWER('Elektronika'));
