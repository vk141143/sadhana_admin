-- ============================================================
-- Migration 012: Festival v3 — normalized schema
-- Adds: festival_occurrences, festival_content
-- Extends: festivals (slug, primary_deity, tradition, cover_media_id, is_active)
-- Preserves: all existing festival rows
-- Removes: flat panchanga/timing columns from festivals (moved to occurrences)
-- ============================================================

-- ── 1. Extend festivals master table ─────────────────────────────────────────
ALTER TABLE public.festivals
  ADD COLUMN IF NOT EXISTS slug           text,
  ADD COLUMN IF NOT EXISTS primary_deity  text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tradition      text DEFAULT 'general'
    CHECK (tradition IN ('vaishnava','shaiva','shakta','smarta','general','other')),
  ADD COLUMN IF NOT EXISTS cover_media_id uuid,
  ADD COLUMN IF NOT EXISTS is_active      boolean NOT NULL DEFAULT true;

-- Backfill slug from name for existing rows (lowercase, spaces→hyphens)
UPDATE public.festivals
SET slug = lower(regexp_replace(trim(name), '[^a-z0-9]+', '-', 'gi'))
WHERE slug IS NULL;

-- Make slug NOT NULL and UNIQUE after backfill
ALTER TABLE public.festivals
  ALTER COLUMN slug SET NOT NULL;

-- Add unique constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'festivals_slug_key'
  ) THEN
    ALTER TABLE public.festivals ADD CONSTRAINT festivals_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Update festival_type check to new values (keep old values working too)
ALTER TABLE public.festivals
  DROP CONSTRAINT IF EXISTS festivals_festival_type_check;
ALTER TABLE public.festivals
  ADD CONSTRAINT festivals_festival_type_check
  CHECK (festival_type IN (
    'Major Festival','Ekadashi','Purnima','Amavasya','Jayanti','Vrata','Utsava','Other',
    'major_festival','ekadashi','purnima','amavasya','jayanti','vrata','utsava','other'
  ));

-- ── 2. Create festival_occurrences ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.festival_occurrences (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  festival_id     uuid        NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  year            integer     NOT NULL,
  festival_date   date        NOT NULL,

  -- Panchanga
  tithi_name      text        DEFAULT '',
  paksha          text        DEFAULT '' CHECK (paksha IN ('','Shukla Paksha','Krishna Paksha')),
  tithi_start     timestamptz,
  tithi_end       timestamptz,

  nakshatra_name  text        DEFAULT '',
  nakshatra_start timestamptz,
  nakshatra_end   timestamptz,

  yoga_name       text        DEFAULT '',
  yoga_start      timestamptz,
  yoga_end        timestamptz,

  karana_name     text        DEFAULT '',
  karana_start    timestamptz,
  karana_end      timestamptz,

  -- Auspicious timings
  shubha_muhurta_start  timestamptz,
  shubha_muhurta_end    timestamptz,
  puja_time_start       timestamptz,
  puja_time_end         timestamptz,
  manchi_samayam_start  timestamptz,
  manchi_samayam_end    timestamptz,

  -- Inauspicious timings
  rahu_kalam_start      timestamptz,
  rahu_kalam_end        timestamptz,
  yamagandam_start      timestamptz,
  yamagandam_end        timestamptz,
  gulika_kalam_start    timestamptz,
  gulika_kalam_end      timestamptz,

  -- Fasting / Vrata
  fasting_enabled       boolean     NOT NULL DEFAULT false,
  fasting_type          text        DEFAULT '',
  fasting_start         timestamptz,
  fasting_end           timestamptz,
  parana_required       boolean     NOT NULL DEFAULT false,
  parana_date           date,
  parana_time           timestamptz,
  fasting_rules         text        DEFAULT '',

  -- Custom timings (JSONB array: [{name, start, end, description}])
  custom_timings        jsonb       NOT NULL DEFAULT '[]'::jsonb,

  -- Calculation location
  calculation_city      text        DEFAULT '',
  calculation_latitude  numeric,
  calculation_longitude numeric,
  timezone              text        DEFAULT 'Asia/Kolkata',

  -- Status & audit
  status          text        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review','published','archived')),
  created_by      uuid,
  updated_by      uuid,
  published_by    uuid,
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT festival_occurrences_pkey PRIMARY KEY (id),
  CONSTRAINT festival_occurrences_festival_year_key UNIQUE (festival_id, year)
);

-- ── 3. Migrate existing festival data into occurrences ───────────────────────
-- For each existing festival that has a festival_date, create a 2025 occurrence
INSERT INTO public.festival_occurrences (
  festival_id, year, festival_date,
  tithi_name, paksha,
  nakshatra_name,
  yoga_name, karana_name,
  status, created_at, updated_at
)
SELECT
  f.id,
  COALESCE(EXTRACT(YEAR FROM f.festival_date)::integer, 2025),
  COALESCE(f.festival_date, CURRENT_DATE),
  COALESCE(f.tithi, ''),
  COALESCE(f.paksha, ''),
  COALESCE(f.nakshatra, ''),
  COALESCE(f.yoga, ''),
  COALESCE(f.karana, ''),
  CASE WHEN f.status = 'Published' THEN 'published' ELSE 'draft' END,
  f.created_at,
  f.updated_at
FROM public.festivals f
ON CONFLICT (festival_id, year) DO NOTHING;

-- ── 4. Create festival_content ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.festival_content (
  id                    uuid  NOT NULL DEFAULT gen_random_uuid(),
  festival_id           uuid  NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  occurrence_id         uuid  REFERENCES public.festival_occurrences(id) ON DELETE CASCADE,

  -- Main content
  festival_description  text  DEFAULT '',
  spiritual_significance text DEFAULT '',
  festival_story        jsonb DEFAULT '[]'::jsonb,
  scriptural_references jsonb DEFAULT '[]'::jsonb,

  -- Puja
  puja_name             text  DEFAULT '',
  puja_duration_minutes integer,
  puja_description      text  DEFAULT '',
  puja_samagri          jsonb DEFAULT '[]'::jsonb,
  puja_vidhi            jsonb DEFAULT '[]'::jsonb,

  -- R2 references for large JSON files
  story_r2_key          text  DEFAULT '',
  story_r2_url          text  DEFAULT '',
  puja_r2_key           text  DEFAULT '',
  puja_r2_url           text  DEFAULT '',

  -- Related Sanatana content (references by ID, no duplication)
  related_scriptures    jsonb DEFAULT '[]'::jsonb,
  related_slokas        jsonb DEFAULT '[]'::jsonb,
  related_mantras       jsonb DEFAULT '[]'::jsonb,
  related_stotrams      jsonb DEFAULT '[]'::jsonb,
  related_music         jsonb DEFAULT '[]'::jsonb,
  related_stories       jsonb DEFAULT '[]'::jsonb,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT festival_content_pkey PRIMARY KEY (id)
);

-- Migrate existing story/puja R2 URLs into festival_content
INSERT INTO public.festival_content (
  festival_id, festival_description,
  story_r2_key, story_r2_url,
  puja_r2_key, puja_r2_url,
  created_at, updated_at
)
SELECT
  f.id,
  COALESCE(f.description, ''),
  COALESCE(f.story_storage_key, ''),
  COALESCE(f.story_url, ''),
  COALESCE(f.puja_storage_key, ''),
  COALESCE(f.puja_url, ''),
  f.created_at,
  f.updated_at
FROM public.festivals f
ON CONFLICT DO NOTHING;

-- ── 5. Update festival_media — add new columns, update type check ─────────────
ALTER TABLE public.festival_media
  ADD COLUMN IF NOT EXISTS occurrence_id   uuid REFERENCES public.festival_occurrences(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title           text DEFAULT '',
  ADD COLUMN IF NOT EXISTS description     text DEFAULT '',
  ADD COLUMN IF NOT EXISTS language_code   text DEFAULT '',
  ADD COLUMN IF NOT EXISTS alt_text        text DEFAULT '',
  ADD COLUMN IF NOT EXISTS caption         text DEFAULT '',
  ADD COLUMN IF NOT EXISTS sort_order      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_cover        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS created_by      uuid;

-- Rename display_order → sort_order if display_order still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'festival_media' AND column_name = 'display_order'
  ) THEN
    UPDATE public.festival_media SET sort_order = display_order WHERE sort_order = 0;
  END IF;
END $$;

-- Update media_type check to new simplified set
ALTER TABLE public.festival_media
  DROP CONSTRAINT IF EXISTS festival_media_media_type_check;
ALTER TABLE public.festival_media
  ADD CONSTRAINT festival_media_media_type_check
  CHECK (media_type IN ('image','audio','video','story_json','puja_json','banner','gallery','notification'));

-- Rename storage_key → r2_key for clarity (add new column, copy data)
ALTER TABLE public.festival_media
  ADD COLUMN IF NOT EXISTS r2_key text DEFAULT '';
UPDATE public.festival_media SET r2_key = storage_key WHERE r2_key = '' AND storage_key != '';

-- Rename public_url → keep as is (already correct name)

-- ── 6. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_festivals_slug          ON public.festivals(slug);
CREATE INDEX IF NOT EXISTS idx_festivals_festival_type ON public.festivals(festival_type);
CREATE INDEX IF NOT EXISTS idx_festivals_primary_deity ON public.festivals(primary_deity);
CREATE INDEX IF NOT EXISTS idx_festivals_is_active     ON public.festivals(is_active);

CREATE INDEX IF NOT EXISTS idx_occurrences_festival_id   ON public.festival_occurrences(festival_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_year          ON public.festival_occurrences(year);
CREATE INDEX IF NOT EXISTS idx_occurrences_festival_date ON public.festival_occurrences(festival_date);
CREATE INDEX IF NOT EXISTS idx_occurrences_status        ON public.festival_occurrences(status);

CREATE INDEX IF NOT EXISTS idx_festival_content_festival_id   ON public.festival_content(festival_id);
CREATE INDEX IF NOT EXISTS idx_festival_content_occurrence_id ON public.festival_content(occurrence_id);

CREATE INDEX IF NOT EXISTS idx_festival_media_festival_id   ON public.festival_media(festival_id);
CREATE INDEX IF NOT EXISTS idx_festival_media_occurrence_id ON public.festival_media(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_festival_media_type          ON public.festival_media(media_type);

-- ── 7. updated_at triggers ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_festival_occurrences_updated_at ON public.festival_occurrences;
CREATE TRIGGER trg_festival_occurrences_updated_at
  BEFORE UPDATE ON public.festival_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_festival_content_updated_at ON public.festival_content;
CREATE TRIGGER trg_festival_content_updated_at
  BEFORE UPDATE ON public.festival_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 8. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.festival_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_content     ENABLE ROW LEVEL SECURITY;

-- Public can read published occurrences
DROP POLICY IF EXISTS "published occurrences readable" ON public.festival_occurrences;
CREATE POLICY "published occurrences readable"
  ON public.festival_occurrences FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Admins can do everything on occurrences
DROP POLICY IF EXISTS "occurrence content admins" ON public.festival_occurrences;
CREATE POLICY "occurrence content admins"
  ON public.festival_occurrences FOR ALL
  TO authenticated
  USING (public.is_content_admin())
  WITH CHECK (public.is_content_admin());

-- Public can read festival_content for published festivals
DROP POLICY IF EXISTS "festival content readable" ON public.festival_content;
CREATE POLICY "festival content readable"
  ON public.festival_content FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.festivals
      WHERE festivals.id = festival_content.festival_id
        AND festivals.status = 'Published'
    )
  );

-- Admins can do everything on festival_content
DROP POLICY IF EXISTS "festival content admins" ON public.festival_content;
CREATE POLICY "festival content admins"
  ON public.festival_content FOR ALL
  TO authenticated
  USING (public.is_content_admin())
  WITH CHECK (public.is_content_admin());

-- ── 9. Grants ─────────────────────────────────────────────────────────────────
GRANT SELECT ON public.festival_occurrences TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.festival_occurrences TO authenticated;
GRANT SELECT ON public.festival_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.festival_content TO authenticated;
