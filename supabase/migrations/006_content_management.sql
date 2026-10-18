-- Content metadata only. Verse text is stored in R2 chapter objects.
CREATE TABLE IF NOT EXISTS public.content_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'Scripture', description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Published','Archived')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.content_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category_id uuid NOT NULL REFERENCES public.content_categories(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL CHECK (chapter_number > 0), name text NOT NULL, description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Published','Archived')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id, chapter_number)
);
CREATE TABLE IF NOT EXISTS public.content_verses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), chapter_id uuid NOT NULL REFERENCES public.content_chapters(id) ON DELETE CASCADE,
  verse_number integer NOT NULL CHECK (verse_number > 0), content_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Published','Archived')),
  available_languages text[] NOT NULL DEFAULT '{}', core_r2_path text NOT NULL,
  language_r2_paths jsonb NOT NULL DEFAULT '{}'::jsonb, version integer NOT NULL DEFAULT 1,
  updated_by text, is_deleted boolean NOT NULL DEFAULT false,
  audio_status text NOT NULL DEFAULT 'not_generated' CHECK (audio_status IN ('not_generated','generating','available','stale','failed')),
  audio_r2_path text, audio_version integer,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chapter_id, verse_number)
);
CREATE INDEX IF NOT EXISTS idx_content_categories_status ON public.content_categories(status);
CREATE INDEX IF NOT EXISTS idx_content_chapters_category ON public.content_chapters(category_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_content_verses_chapter ON public.content_verses(chapter_id, verse_number) WHERE NOT is_deleted;
CREATE OR REPLACE FUNCTION public.set_content_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_content_categories_updated_at ON public.content_categories;
DROP TRIGGER IF EXISTS trg_content_chapters_updated_at ON public.content_chapters;
DROP TRIGGER IF EXISTS trg_content_verses_updated_at ON public.content_verses;
CREATE TRIGGER trg_content_categories_updated_at BEFORE UPDATE ON public.content_categories FOR EACH ROW EXECUTE FUNCTION public.set_content_updated_at();
CREATE TRIGGER trg_content_chapters_updated_at BEFORE UPDATE ON public.content_chapters FOR EACH ROW EXECUTE FUNCTION public.set_content_updated_at();
CREATE TRIGGER trg_content_verses_updated_at BEFORE UPDATE ON public.content_verses FOR EACH ROW EXECUTE FUNCTION public.set_content_updated_at();

-- These tables contain publishing metadata and must not be exposed to anonymous clients.
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_verses ENABLE ROW LEVEL SECURITY;

-- Admin roles already live in public.admin_users. Editors are the content-manager role.
CREATE OR REPLACE FUNCTION public.is_content_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND is_active = true
      AND role IN ('super_admin', 'editor')
  );
$$;
REVOKE ALL ON FUNCTION public.is_content_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_content_admin() TO authenticated;

DROP POLICY IF EXISTS "content admin select categories" ON public.content_categories;
DROP POLICY IF EXISTS "content admin modify categories" ON public.content_categories;
DROP POLICY IF EXISTS "content admin select chapters" ON public.content_chapters;
DROP POLICY IF EXISTS "content admin modify chapters" ON public.content_chapters;
DROP POLICY IF EXISTS "content admin select verses" ON public.content_verses;
DROP POLICY IF EXISTS "content admin modify verses" ON public.content_verses;
CREATE POLICY "content admin select categories" ON public.content_categories FOR SELECT TO authenticated USING (public.is_content_admin());
CREATE POLICY "content admin modify categories" ON public.content_categories FOR ALL TO authenticated USING (public.is_content_admin()) WITH CHECK (public.is_content_admin());
CREATE POLICY "content admin select chapters" ON public.content_chapters FOR SELECT TO authenticated USING (public.is_content_admin());
CREATE POLICY "content admin modify chapters" ON public.content_chapters FOR ALL TO authenticated USING (public.is_content_admin()) WITH CHECK (public.is_content_admin());
CREATE POLICY "content admin select verses" ON public.content_verses FOR SELECT TO authenticated USING (public.is_content_admin());
CREATE POLICY "content admin modify verses" ON public.content_verses FOR ALL TO authenticated USING (public.is_content_admin()) WITH CHECK (public.is_content_admin());
