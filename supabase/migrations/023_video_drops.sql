-- VideoDrops: admin-managed gallery for HypeGallery
-- Migrates current hardcoded videos into dynamic DB records

CREATE TABLE video_drops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  thumbnail_url TEXT,
  video_url     TEXT,
  original_url  TEXT,
  youtube_url   TEXT,
  is_new        BOOLEAN DEFAULT false,
  is_active     BOOLEAN DEFAULT true,
  clicks        INTEGER DEFAULT 0,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER video_drops_updated_at BEFORE UPDATE ON video_drops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_video_drops_sort_order ON video_drops(sort_order);
CREATE INDEX idx_video_drops_active ON video_drops(is_active) WHERE is_active = true;

ALTER TABLE video_drops ENABLE ROW LEVEL SECURITY;

-- Public: only active records
CREATE POLICY "video_drops_public_select" ON video_drops
  FOR SELECT USING (is_active = true);

-- Admin: full CRUD via authenticated admins table
CREATE POLICY "video_drops_admin_all" ON video_drops
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- Seed: migrate the 3 current hardcoded videos so the gallery never shows empty
-- After INSERT, update URLs to point to Supabase Storage (UUIDs are auto-generated)
INSERT INTO video_drops (title, thumbnail_url, video_url, youtube_url, sort_order) VALUES
  ('Mistery Box a MIKE SOUTHSIDE', '/gallery/gallery-1.webp', '/gallery/gallery-1-preview.mp4', 'https://youtu.be/JSXq-vfGYHw', 0),
  ('Como es el SNEAKERCON de ARGENTINA - Evento DROPNKICKS 3ra edicion', '/gallery/gallery-2.webp', '/gallery/gallery-2-preview.mp4', 'https://youtu.be/2EmNCa2J8lE', 1),
  ('¡¡ VISTIENDO A KAYDY CAIN para su SHOW !! (RH STORE ft. BYBKICKS)', '/gallery/gallery-3.webp', '/gallery/gallery-3-preview.mp4', 'https://youtu.be/MqNySCr1oMY', 2);

-- Construct Storage URLs from auto-generated UUIDs so fresh setups also use Supabase
UPDATE video_drops SET
  thumbnail_url = 'https://wfvyxffxtwwcrxpffbbl.supabase.co/storage/v1/object/public/video-drops/' || id || '/thumbnail.webp',
  video_url = 'https://wfvyxffxtwwcrxpffbbl.supabase.co/storage/v1/object/public/video-drops/' || id || '/preview.mp4'
WHERE thumbnail_url IS NULL OR thumbnail_url LIKE '/gallery/%';
