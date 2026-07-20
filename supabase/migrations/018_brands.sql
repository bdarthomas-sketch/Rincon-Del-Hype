-- Crear tabla brands y agregar brand_id a products

CREATE TABLE brands (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

-- Migrar brands existentes desde products.brand
-- Con manejo de slugs duplicados
WITH unique_brands AS (
  SELECT DISTINCT TRIM(brand) AS name
  FROM products
  WHERE brand IS NOT NULL AND TRIM(brand) != ''
),
brands_with_base_slug AS (
  SELECT name, LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) AS base_slug
  FROM unique_brands
),
slug_dedup AS (
  SELECT name, base_slug,
    ROW_NUMBER() OVER (PARTITION BY base_slug ORDER BY name) AS rn
  FROM brands_with_base_slug
)
INSERT INTO brands (name, slug)
SELECT name, CASE WHEN rn = 1 THEN base_slug ELSE base_slug || '-' || rn END
FROM slug_dedup;

-- Agregar brand_id a products
ALTER TABLE products ADD COLUMN brand_id UUID REFERENCES brands(id);

-- Actualizar products con brand_id
UPDATE products p
SET brand_id = b.id
FROM brands b
WHERE TRIM(p.brand) = b.name;

CREATE INDEX idx_products_brand_id ON products(brand_id);
