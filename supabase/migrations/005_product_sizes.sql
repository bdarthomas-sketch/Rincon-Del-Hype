-- Product-Size relationship (M:N)
CREATE TABLE product_sizes (
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_id     UUID NOT NULL REFERENCES sizes(id) ON DELETE RESTRICT,
  stock       INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  PRIMARY KEY (product_id, size_id)
);
