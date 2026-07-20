-- Products table
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  brand         TEXT NOT NULL,
  brands        TEXT[] DEFAULT '{}',
  price         NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  category_id   UUID REFERENCES categories(id) ON DELETE RESTRICT,
  description   TEXT,
  is_new        BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  image_padding TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
