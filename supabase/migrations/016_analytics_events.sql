CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  session_id TEXT,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ae_type_created ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_ae_product ON analytics_events(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_ae_session ON analytics_events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_ae_created ON analytics_events(created_at DESC);
