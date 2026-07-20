-- Add per-product image adjustment columns
ALTER TABLE products ADD COLUMN auto_trim BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN image_margin INTEGER NOT NULL DEFAULT 50;
