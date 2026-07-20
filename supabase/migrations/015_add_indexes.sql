CREATE INDEX idx_products_is_active ON products(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_sizes_stock ON product_sizes(stock);
CREATE INDEX idx_products_old_price ON products(old_price) WHERE old_price IS NOT NULL;
