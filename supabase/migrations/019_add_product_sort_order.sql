ALTER TABLE products ADD COLUMN sort_order INT NOT NULL DEFAULT 0;
CREATE INDEX idx_products_sort_order ON products(sort_order);
