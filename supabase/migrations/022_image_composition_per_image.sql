ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS image_mode TEXT DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS image_scale REAL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS image_offset_x REAL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS image_offset_y REAL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS image_padding INTEGER DEFAULT 0;

-- Copiar valores actuales del producto a cada imagen existente
UPDATE product_images pi
SET
  image_mode = p.image_mode,
  image_scale = p.image_scale,
  image_offset_x = p.image_offset_x,
  image_offset_y = p.image_offset_y
FROM products p
WHERE pi.product_id = p.id;

-- Mantener columnas en products por backwards compatibility pero
-- ya no usarlas como fuente de verdad para nuevos productos
