-- Enable RLS on all tables
ALTER TABLE categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PRODUCTS: public read (active only), admin write
-- ============================================================
CREATE POLICY "products_public_select" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "products_admin_all" ON products
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- ============================================================
-- CATEGORIES: public read, admin write
-- ============================================================
CREATE POLICY "categories_public_select" ON categories
  FOR SELECT USING (true);

CREATE POLICY "categories_admin_all" ON categories
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- ============================================================
-- SIZES: public read, admin write
-- ============================================================
CREATE POLICY "sizes_public_select" ON sizes
  FOR SELECT USING (true);

CREATE POLICY "sizes_admin_all" ON sizes
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- ============================================================
-- PRODUCT_SIZES: public read (active products), admin write
-- ============================================================
CREATE POLICY "product_sizes_public_select" ON product_sizes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM products WHERE id = product_id AND is_active = true)
  );

CREATE POLICY "product_sizes_admin_all" ON product_sizes
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- ============================================================
-- PRODUCT_IMAGES: public read (active products), admin write
-- ============================================================
CREATE POLICY "product_images_public_select" ON product_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM products WHERE id = product_id AND is_active = true)
  );

CREATE POLICY "product_images_admin_all" ON product_images
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- ============================================================
-- ADMINS: only superadmin can manage
-- ============================================================
CREATE POLICY "admins_admin_select" ON admins
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

CREATE POLICY "admins_superadmin_all" ON admins
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND role = 'superadmin')
  );

-- ============================================================
-- STORAGE RLS (applied via Supabase dashboard UI)
-- ============================================================
-- Bucket: product-images
-- Policy: public SELECT
-- Policy: INSERT/UPDATE/DELETE only for authenticated admins
