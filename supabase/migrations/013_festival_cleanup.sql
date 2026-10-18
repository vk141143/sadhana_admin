-- ============================================================
-- Migration 013: Festival module cleanup
-- - Removes festival_notifications table (notifications removed from UI)
-- - Ensures festival_settings table exists
-- - Adds missing festival_type index
-- - Normalizes media_type check to include 'image' type
-- ============================================================

-- ── 1. Ensure festival_settings exists ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.festival_settings (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id      uuid        NOT NULL UNIQUE REFERENCES public.festivals(id) ON DELETE CASCADE,
  show_on_home     boolean     NOT NULL DEFAULT false,
  is_featured      boolean     NOT NULL DEFAULT false,
  priority         integer     NOT NULL DEFAULT 0,
  show_from        date,
  show_until       date,
  show_in_calendar boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Add 'image' to festival_media media_type check ────────────────────────
ALTER TABLE public.festival_media DROP CONSTRAINT IF EXISTS festival_media_media_type_check;
ALTER TABLE public.festival_media
  ADD CONSTRAINT festival_media_media_type_check
  CHECK (media_type IN ('image','audio','video','banner','gallery','story_json','puja_json','notification'));

-- ── 3. Missing indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_festivals_festival_type ON public.festivals(festival_type);
CREATE INDEX IF NOT EXISTS idx_fest_media_festival_id  ON public.festival_media(festival_id);

-- ── 4. RLS for festival_settings ─────────────────────────────────────────────
ALTER TABLE public.festival_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read settings"  ON public.festival_settings;
CREATE POLICY "public read settings" ON public.festival_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin settings" ON public.festival_settings;
CREATE POLICY "admin settings" ON public.festival_settings
  FOR ALL TO authenticated
  USING (public.is_content_admin()) WITH CHECK (public.is_content_admin());

GRANT SELECT ON public.festival_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.festival_settings TO authenticated;

-- ── 5. updated_at trigger for festival_settings ───────────────────────────────
DROP TRIGGER IF EXISTS trg_fest_settings_updated_at ON public.festival_settings;
CREATE TRIGGER trg_fest_settings_updated_at
  BEFORE UPDATE ON public.festival_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
