ALTER TABLE products ADD COLUMN image_scale REAL NOT NULL DEFAULT 1.0;
ALTER TABLE products ADD COLUMN image_offset_x REAL NOT NULL DEFAULT 0.0;
ALTER TABLE products ADD COLUMN image_offset_y REAL NOT NULL DEFAULT 0.0;
ALTER TABLE products ADD COLUMN image_mode TEXT NOT NULL DEFAULT 'fit';

UPDATE products SET
  image_mode = CASE WHEN auto_trim THEN 'cover' ELSE 'fit' END,
  image_scale = 1.0,
  image_offset_x = 0,
  image_offset_y = 0;
