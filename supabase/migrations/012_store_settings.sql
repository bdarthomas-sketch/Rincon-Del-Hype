CREATE TABLE store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES admins(id)
);

INSERT INTO store_settings (key, value) VALUES
  ('store_info', '{"name":"Rincon del Hype","logo":"","whatsapp":"541136660741","instagram":"","tiktok":"","x":"","youtube":""}');
