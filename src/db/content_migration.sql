-- ============================================================
-- CONTENT MIGRATION: scriptures, chapters, slokas
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- 1. SCRIPTURES
CREATE TABLE IF NOT EXISTS public.scriptures (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  cover_image_url text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Published','Archived')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. CHAPTERS
CREATE TABLE IF NOT EXISTS public.chapters (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scripture_id   uuid NOT NULL REFERENCES public.scriptures(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL CHECK (chapter_number > 0),
  title          text NOT NULL,
  subtitle       text NOT NULL DEFAULT '',
  description    text NOT NULL DEFAULT '',
  image_url      text NOT NULL DEFAULT '',
  sloka_count    integer NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Published','Archived')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scripture_id, chapter_number)
);

-- 3. SLOKAS
CREATE TABLE IF NOT EXISTS public.slokas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id   uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  verse_number integer NOT NULL CHECK (verse_number > 0),
  verse_id     text NOT NULL,
  json_url     text NOT NULL,
  status       text NOT NULL DEFAULT 'Published' CHECK (status IN ('Draft','Published','Archived')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, verse_number),
  UNIQUE (chapter_id, verse_id)
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_chapters_scripture_id ON public.chapters(scripture_id);
CREATE INDEX IF NOT EXISTS idx_slokas_chapter_id ON public.slokas(chapter_id);
CREATE INDEX IF NOT EXISTS idx_slokas_verse_id ON public.slokas(verse_id);

-- 5. AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_scriptures_updated_at ON public.scriptures;
CREATE TRIGGER trg_scriptures_updated_at
  BEFORE UPDATE ON public.scriptures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_chapters_updated_at ON public.chapters;
CREATE TRIGGER trg_chapters_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_slokas_updated_at ON public.slokas;
CREATE TRIGGER trg_slokas_updated_at
  BEFORE UPDATE ON public.slokas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. RLS — only active editors and super admins can access CMS metadata.
ALTER TABLE public.scriptures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slokas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_content_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND is_active = true AND role IN ('super_admin', 'editor')
  );
$$;
REVOKE ALL ON FUNCTION public.is_content_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_content_admin() TO authenticated;

DROP POLICY IF EXISTS "scripture content admins" ON public.scriptures;
CREATE POLICY "scripture content admins" ON public.scriptures FOR ALL TO authenticated USING (public.is_content_admin()) WITH CHECK (public.is_content_admin());
DROP POLICY IF EXISTS "chapter content admins" ON public.chapters;
CREATE POLICY "chapter content admins" ON public.chapters FOR ALL TO authenticated USING (public.is_content_admin()) WITH CHECK (public.is_content_admin());
DROP POLICY IF EXISTS "sloka content admins" ON public.slokas;
CREATE POLICY "sloka content admins" ON public.slokas FOR ALL TO authenticated USING (public.is_content_admin()) WITH CHECK (public.is_content_admin());

INSERT INTO public.scriptures (name, description, status) VALUES
  ('Bhagavad Gita', 'The 700-verse Hindu scripture that is part of the epic Mahabharata.', 'Published'),
  ('Ramayana',      'The ancient Indian epic poem narrating the life of Rama.', 'Published'),
  ('Mahabharata',   'One of the two major Sanskrit epics of ancient India.', 'Draft'),
  ('Puranas',       'A genre of ancient Indian literature in the Hindu tradition.', 'Draft'),
  ('Vedas',         'The oldest scriptures of Hinduism.', 'Draft')
ON CONFLICT DO NOTHING;
