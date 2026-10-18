-- ============================================================
-- Migration 012: Normalized Festival Schema
-- Adds festival_occurrences, festival_content tables.
-- Upgrades festival_media. Preserves existing festivals data.
-- ============================================================

-- ── 1. Add new columns to festivals (master identity) ────────────────────────
ALTER TABLE public.festivals
  ADD COLUMN IF NOT EXISTS slug             text,
  ADD COLUMN IF NOT EXISTS primary_deity    text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tradition        text DEFAULT 'general'
    CHECK (tradition IN ('vaishnava','shaiva','shakta','smarta','general','other')),
  ADD COLUMN IF NOT EXISTS cover_media_id   uuid,
  ADD COLUMN IF NOT EXISTS is_active        boolean NOT NULL DEFAULT true;

-- Make slug unique where set
CREATE UNIQUE INDEX IF NOT EXISTS idx_festivals_slug ON public.festivals(slug) WHERE slug IS NOT NULL AND slug <> '';

-- ── 2. festival_occurrences ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.festival_occurrences (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id             uuid        NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  year                    integer     NOT NULL,
  festival_date           date        NOT NULL,
  -- Panchanga
  tithi_name              text        DEFAULT '',
  paksha                  text        DEFAULT '',
  tithi_start             timestamptz,
  tithi_end               timestamptz,
  nakshatra_name          text        DEFAULT '',
  nakshatra_start         timestamptz,
  nakshatra_end           timestamptz,
  yoga_name               text        DEFAULT '',
  yoga_start              timestamptz,
  yoga_end                timestamptz,
  karana_name             text        DEFAULT '',
  karana_start            timestamptz,
  karana_end              timestamptz,
  -- Auspicious timings
  shubha_muhurta_start    timestamptz,
  shubha_muhurta_end      timestamptz,
  puja_time_start         timestamptz,
  puja_time_end           timestamptz,
  manchi_samayam_start    timestamptz,
  manchi_samayam_end      timestamptz,
  -- Inauspicious timings
  rahu_kalam_start        timestamptz,
  rahu_kalam_end          timestamptz,
  yamagandam_start        timestamptz,
  yamagandam_end          timestamptz,
  gulika_kalam_start      timestamptz,
  gulika_kalam_end        timestamptz,
  -- Fasting / Vrata
  fasting_enabled         boolean     NOT NULL DEFAULT false,
  fasting_type            text        DEFAULT '',
  fasting_start           timestamptz,
  fasting_end             timestamptz,
  parana_required         boolean     NOT NULL DEFAULT false,
  parana_date             date,
  parana_time             timestamptz,
  fasting_rules           text        DEFAULT '',
  -- Custom timings
  custom_timings          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- Calculation location
  calculation_city        text        DEFAULT '',
  calculation_latitude    numeric,
  calculation_longitude   numeric,
  timezone                text        DEFAULT 'Asia/Kolkata',
  -- Status & audit
  status                  text        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review','published','archived')),
  created_by              uuid,
  updated_by              uuid,
  published_by            uuid,
  published_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (festival_id, year)
);

-- ── 3. festival_content ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.festival_content (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id             uuid        NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  occurrence_id           uuid        REFERENCES public.festival_occurrences(id) ON DELETE CASCADE,
  -- Descriptions
  festival_description    text        DEFAULT '',
  spiritual_significance  text        DEFAULT '',
  festival_story          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  scriptural_references   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- Puja
  puja_name               text        DEFAULT '',
  puja_duration_minutes   integer,
  puja_description        text        DEFAULT '',
  puja_samagri            jsonb       NOT NULL DEFAULT '[]'::jsonb,
  puja_vidhi              jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- R2 JSON references
  story_r2_key            text        DEFAULT '',
  story_r2_url            text        DEFAULT '',
  puja_r2_key             text        DEFAULT '',
  puja_r2_url             text        DEFAULT '',
  -- Related Sanatana content (references only, no duplication)
  related_scriptures      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  related_slokas          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  related_mantras         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  related_stotrams        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  related_music           jsonb       NOT NULL DEFAULT '[]'::jsonb,
  related_stories         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ── 4. Upgrade festival_media ─────────────────────────────────────────────────
ALTER TABLE public.festival_media
  ADD COLUMN IF NOT EXISTS occurrence_id    uuid REFERENCES public.festival_occurrences(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title            text DEFAULT '',
  ADD COLUMN IF NOT EXISTS description      text DEFAULT '',
  ADD COLUMN IF NOT EXISTS r2_key           text DEFAULT '',
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS language_code    text DEFAULT '',
  ADD COLUMN IF NOT EXISTS alt_text         text DEFAULT '',
  ADD COLUMN IF NOT EXISTS caption          text DEFAULT '',
  ADD COLUMN IF NOT EXISTS sort_order       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_cover         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by       uuid;

-- Sync r2_key from storage_key for existing rows
UPDATE public.festival_media SET r2_key = storage_key WHERE r2_key = '' AND storage_key <> '';

-- Update media_type check to include new types
ALTER TABLE public.festival_media DROP CONSTRAINT IF EXISTS festival_media_media_type_check;
ALTER TABLE public.festival_media
  ADD CONSTRAINT festival_media_media_type_check
  CHECK (media_type IN ('image','audio','video','banner','gallery','story_json','puja_json','notification'));

-- ── 5. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_festivals_is_active         ON public.festivals(is_active);
CREATE INDEX IF NOT EXISTS idx_festivals_primary_deity     ON public.festivals(primary_deity);
CREATE INDEX IF NOT EXISTS idx_fest_occ_festival_id        ON public.festival_occurrences(festival_id);
CREATE INDEX IF NOT EXISTS idx_fest_occ_year               ON public.festival_occurrences(year);
CREATE INDEX IF NOT EXISTS idx_fest_occ_date               ON public.festival_occurrences(festival_date);
CREATE INDEX IF NOT EXISTS idx_fest_occ_status             ON public.festival_occurrences(status);
CREATE INDEX IF NOT EXISTS idx_fest_content_festival_id    ON public.festival_content(festival_id);
CREATE INDEX IF NOT EXISTS idx_fest_media_occurrence_id    ON public.festival_media(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_fest_media_type             ON public.festival_media(media_type);

-- ── 6. updated_at triggers ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_fest_occ_updated_at     ON public.festival_occurrences;
DROP TRIGGER IF EXISTS trg_fest_content_updated_at ON public.festival_content;

CREATE TRIGGER trg_fest_occ_updated_at
  BEFORE UPDATE ON public.festival_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_fest_content_updated_at
  BEFORE UPDATE ON public.festival_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 7. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.festival_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_content     ENABLE ROW LEVEL SECURITY;

-- Public read: published only
DROP POLICY IF EXISTS "public read occurrences"  ON public.festival_occurrences;
CREATE POLICY "public read occurrences" ON public.festival_occurrences
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "public read content" ON public.festival_content;
CREATE POLICY "public read content" ON public.festival_content
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.festivals f WHERE f.id = festival_id AND f.status = 'Published'
  ));

-- Admin full access
DROP POLICY IF EXISTS "admin occurrences" ON public.festival_occurrences;
CREATE POLICY "admin occurrences" ON public.festival_occurrences
  FOR ALL TO authenticated
  USING (public.is_content_admin()) WITH CHECK (public.is_content_admin());

DROP POLICY IF EXISTS "admin content" ON public.festival_content;
CREATE POLICY "admin content" ON public.festival_content
  FOR ALL TO authenticated
  USING (public.is_content_admin()) WITH CHECK (public.is_content_admin());

-- Grants
GRANT SELECT ON public.festival_occurrences, public.festival_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.festival_occurrences, public.festival_content TO authenticated;
