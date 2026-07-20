ALTER TABLE product_images ADD COLUMN path TEXT;
ALTER TABLE products ADD COLUMN old_price NUMERIC(10,2) CHECK (old_price IS NULL OR old_price >= 0);
