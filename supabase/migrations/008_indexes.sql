-- Performance indexes
CREATE INDEX idx_products_category   ON products(category_id) WHERE is_active = true;
CREATE INDEX idx_products_brand      ON products(brand);
CREATE INDEX idx_products_price      ON products(price);
CREATE INDEX idx_products_slug       ON products(slug);
CREATE INDEX idx_products_is_new     ON products(is_new) WHERE is_new = true;
CREATE INDEX idx_products_name_trgm  ON products USING gin(name gin_trgm_ops);
CREATE INDEX idx_product_sizes_pid   ON product_sizes(product_id);
CREATE INDEX idx_product_sizes_sid   ON product_sizes(size_id);
CREATE INDEX idx_product_images_pid  ON product_images(product_id);
CREATE INDEX idx_categories_slug     ON categories(slug);
CREATE INDEX idx_admins_user_id      ON admins(user_id);
