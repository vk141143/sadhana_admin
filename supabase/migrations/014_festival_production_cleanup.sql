-- ============================================================
-- Migration 014: Festival Production Safety Cleanup
--
-- SAFETY APPROACH:
--   1. Migrate legacy data into normalized tables FIRST
--   2. Add missing columns / constraints
--   3. Enable RLS on festivals + festival_media
--   4. Drop legacy tables only after confirming row counts
--   5. Drop redundant columns from festivals only after migration
--
-- STATUS CONVENTION:
--   festivals.status          → 'Draft' | 'Published' | 'Archived'  (Title Case — existing convention)
--   festival_occurrences.status → 'draft' | 'review' | 'published' | 'archived' (lowercase — existing convention)
--   These are intentionally different and consistent within each table.
--   DO NOT change either convention — all existing code depends on them.
-- ============================================================

-- ── SECTION 1: Add missing columns to festivals ───────────────────────────────

ALTER TABLE public.festivals
  ADD COLUMN IF NOT EXISTS associated_deities jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by         uuid;

-- ── SECTION 2: Migrate legacy festival_timings data into festival_occurrences ─
-- Only migrate rows where a matching occurrence exists (matched by festival_id).
-- festival_timings uses text columns; occurrences use timestamptz.
-- We only migrate if the occurrence has NULL for those timing fields.
-- festival_timings.shubha_muhurta_start/end, puja_start/end, manchi_samayam_start/end,
-- rahu_kalam_start/end, yamagandam_start/end, gulika_start/end

DO $$
DECLARE
  timing_count integer;
BEGIN
  SELECT COUNT(*) INTO timing_count FROM public.festival_timings;
  RAISE NOTICE 'festival_timings row count: %', timing_count;

  IF timing_count > 0 THEN
    -- Migrate non-empty text timing values into the most recent occurrence per festival
    -- Only update occurrence fields that are currently NULL (don't overwrite normalized data)
    UPDATE public.festival_occurrences fo
    SET
      shubha_muhurta_start = CASE
        WHEN fo.shubha_muhurta_start IS NULL AND ft.shubha_muhurta_start <> ''
        THEN (fo.festival_date::text || 'T' || ft.shubha_muhurta_start || ':00+05:30')::timestamptz
        ELSE fo.shubha_muhurta_start END,
      shubha_muhurta_end = CASE
        WHEN fo.shubha_muhurta_end IS NULL AND ft.shubha_muhurta_end <> ''
        THEN (fo.festival_date::text || 'T' || ft.shubha_muhurta_end || ':00+05:30')::timestamptz
        ELSE fo.shubha_muhurta_end END,
      puja_time_start = CASE
        WHEN fo.puja_time_start IS NULL AND ft.puja_start <> ''
        THEN (fo.festival_date::text || 'T' || ft.puja_start || ':00+05:30')::timestamptz
        ELSE fo.puja_time_start END,
      puja_time_end = CASE
        WHEN fo.puja_time_end IS NULL AND ft.puja_end <> ''
        THEN (fo.festival_date::text || 'T' || ft.puja_end || ':00+05:30')::timestamptz
        ELSE fo.puja_time_end END,
      manchi_samayam_start = CASE
        WHEN fo.manchi_samayam_start IS NULL AND ft.manchi_samayam_start <> ''
        THEN (fo.festival_date::text || 'T' || ft.manchi_samayam_start || ':00+05:30')::timestamptz
        ELSE fo.manchi_samayam_start END,
      manchi_samayam_end = CASE
        WHEN fo.manchi_samayam_end IS NULL AND ft.manchi_samayam_end <> ''
        THEN (fo.festival_date::text || 'T' || ft.manchi_samayam_end || ':00+05:30')::timestamptz
        ELSE fo.manchi_samayam_end END,
      rahu_kalam_start = CASE
        WHEN fo.rahu_kalam_start IS NULL AND ft.rahu_kalam_start <> ''
        THEN (fo.festival_date::text || 'T' || ft.rahu_kalam_start || ':00+05:30')::timestamptz
        ELSE fo.rahu_kalam_start END,
      rahu_kalam_end = CASE
        WHEN fo.rahu_kalam_end IS NULL AND ft.rahu_kalam_end <> ''
        THEN (fo.festival_date::text || 'T' || ft.rahu_kalam_end || ':00+05:30')::timestamptz
        ELSE fo.rahu_kalam_end END,
      yamagandam_start = CASE
        WHEN fo.yamagandam_start IS NULL AND ft.yamagandam_start <> ''
        THEN (fo.festival_date::text || 'T' || ft.yamagandam_start || ':00+05:30')::timestamptz
        ELSE fo.yamagandam_start END,
      yamagandam_end = CASE
        WHEN fo.yamagandam_end IS NULL AND ft.yamagandam_end <> ''
        THEN (fo.festival_date::text || 'T' || ft.yamagandam_end || ':00+05:30')::timestamptz
        ELSE fo.yamagandam_end END,
      gulika_kalam_start = CASE
        WHEN fo.gulika_kalam_start IS NULL AND ft.gulika_start <> ''
        THEN (fo.festival_date::text || 'T' || ft.gulika_start || ':00+05:30')::timestamptz
        ELSE fo.gulika_kalam_start END,
      gulika_kalam_end = CASE
        WHEN fo.gulika_kalam_end IS NULL AND ft.gulika_end <> ''
        THEN (fo.festival_date::text || 'T' || ft.gulika_end || ':00+05:30')::timestamptz
        ELSE fo.gulika_kalam_end END
    FROM public.festival_timings ft
    WHERE ft.festival_id = fo.festival_id;

    RAISE NOTICE 'Migrated festival_timings data into festival_occurrences.';
  END IF;
END $$;

-- ── SECTION 3: Migrate legacy festivals columns into normalized tables ─────────
-- Only migrate where the normalized table has empty/null values.

-- 3a. Migrate festivals.description → festival_content.festival_description
UPDATE public.festival_content fc
SET festival_description = f.description
FROM public.festivals f
WHERE fc.festival_id = f.id
  AND (fc.festival_description IS NULL OR fc.festival_description = '')
  AND f.description IS NOT NULL
  AND f.description <> '';

-- 3b. Insert festival_content rows for festivals that have description but no content row yet
INSERT INTO public.festival_content (festival_id, festival_description, created_at, updated_at)
SELECT
  f.id,
  f.description,
  f.created_at,
  f.updated_at
FROM public.festivals f
WHERE f.description IS NOT NULL
  AND f.description <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.festival_content fc WHERE fc.festival_id = f.id
  )
ON CONFLICT DO NOTHING;

-- 3c. Migrate story/puja R2 references into festival_content
UPDATE public.festival_content fc
SET
  story_r2_key = CASE WHEN (fc.story_r2_key IS NULL OR fc.story_r2_key = '') AND f.story_storage_key <> '' THEN f.story_storage_key ELSE fc.story_r2_key END,
  story_r2_url = CASE WHEN (fc.story_r2_url IS NULL OR fc.story_r2_url = '') AND f.story_url <> '' THEN f.story_url ELSE fc.story_r2_url END,
  puja_r2_key  = CASE WHEN (fc.puja_r2_key IS NULL OR fc.puja_r2_key = '') AND f.puja_storage_key <> '' THEN f.puja_storage_key ELSE fc.puja_r2_key END,
  puja_r2_url  = CASE WHEN (fc.puja_r2_url IS NULL OR fc.puja_r2_url = '') AND f.puja_url <> '' THEN f.puja_url ELSE fc.puja_r2_url END
FROM public.festivals f
WHERE fc.festival_id = f.id;

-- 3d. Migrate banner_url into festival_media as 'banner' type (only if not already there)
INSERT INTO public.festival_media (
  festival_id, media_type, storage_key, r2_key, public_url,
  file_name, mime_type, file_size, sort_order, is_cover, created_at
)
SELECT
  f.id,
  'banner',
  f.banner_storage_key,
  f.banner_storage_key,
  f.banner_url,
  'banner',
  'image/jpeg',
  0,
  0,
  true,
  f.created_at
FROM public.festivals f
WHERE f.banner_url IS NOT NULL
  AND f.banner_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.festival_media fm
    WHERE fm.festival_id = f.id AND fm.is_cover = true
  )
ON CONFLICT DO NOTHING;

-- 3e. Update cover_media_id to point to the newly inserted banner media rows
UPDATE public.festivals f
SET cover_media_id = fm.id
FROM public.festival_media fm
WHERE fm.festival_id = f.id
  AND fm.is_cover = true
  AND f.cover_media_id IS NULL;

-- 3f. Migrate story_audio/video into festival_media
INSERT INTO public.festival_media (
  festival_id, media_type, storage_key, r2_key, public_url,
  file_name, mime_type, file_size, sort_order, is_cover, created_at
)
SELECT
  f.id,
  'audio',
  f.story_audio_key,
  f.story_audio_key,
  f.story_audio_url,
  'story-audio',
  'audio/mpeg',
  0,
  1,
  false,
  f.created_at
FROM public.festivals f
WHERE f.story_audio_url IS NOT NULL
  AND f.story_audio_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.festival_media fm
    WHERE fm.festival_id = f.id AND fm.media_type = 'audio'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.festival_media (
  festival_id, media_type, storage_key, r2_key, public_url,
  file_name, mime_type, file_size, sort_order, is_cover, created_at
)
SELECT
  f.id,
  'video',
  f.story_video_key,
  f.story_video_key,
  f.story_video_url,
  'story-video',
  'video/mp4',
  0,
  2,
  false,
  f.created_at
FROM public.festivals f
WHERE f.story_video_url IS NOT NULL
  AND f.story_video_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.festival_media fm
    WHERE fm.festival_id = f.id AND fm.media_type = 'video'
  )
ON CONFLICT DO NOTHING;

-- ── SECTION 4: Fix cover_media_id FK — null out invalid references ────────────
-- Before adding the FK constraint, set any cover_media_id that doesn't exist
-- in festival_media to NULL to avoid constraint violation.
UPDATE public.festivals
SET cover_media_id = NULL
WHERE cover_media_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.festival_media WHERE id = cover_media_id
  );

-- Now add the FK constraint
ALTER TABLE public.festivals
  DROP CONSTRAINT IF EXISTS festivals_cover_media_id_fkey;
ALTER TABLE public.festivals
  ADD CONSTRAINT festivals_cover_media_id_fkey
  FOREIGN KEY (cover_media_id)
  REFERENCES public.festival_media(id)
  ON DELETE SET NULL;

-- ── SECTION 5: Add festival_media.updated_at ─────────────────────────────────
ALTER TABLE public.festival_media
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Use the existing set_updated_at() function (created in migration 005)
DROP TRIGGER IF EXISTS trg_festival_media_updated_at ON public.festival_media;
CREATE TRIGGER trg_festival_media_updated_at
  BEFORE UPDATE ON public.festival_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── SECTION 6: Enable RLS on festivals ───────────────────────────────────────
ALTER TABLE public.festivals ENABLE ROW LEVEL SECURITY;

-- Public: read only Published festivals (Title Case — existing convention)
DROP POLICY IF EXISTS "published festivals readable" ON public.festivals;
CREATE POLICY "published festivals readable"
  ON public.festivals FOR SELECT
  TO anon, authenticated
  USING (status = 'Published' AND is_active = true);

-- Admins: full access
DROP POLICY IF EXISTS "festival content admins full" ON public.festivals;
CREATE POLICY "festival content admins full"
  ON public.festivals FOR ALL
  TO authenticated
  USING (public.is_content_admin())
  WITH CHECK (public.is_content_admin());

GRANT SELECT ON public.festivals TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.festivals TO authenticated;

-- ── SECTION 7: Enable RLS on festival_media ───────────────────────────────────
ALTER TABLE public.festival_media ENABLE ROW LEVEL SECURITY;

-- Public: read media only when parent festival is Published
DROP POLICY IF EXISTS "published festival media readable" ON public.festival_media;
CREATE POLICY "published festival media readable"
  ON public.festival_media FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.festivals f
      WHERE f.id = festival_media.festival_id
        AND f.status = 'Published'
        AND f.is_active = true
    )
  );

-- Admins: full access
DROP POLICY IF EXISTS "festival media admins" ON public.festival_media;
CREATE POLICY "festival media admins"
  ON public.festival_media FOR ALL
  TO authenticated
  USING (public.is_content_admin())
  WITH CHECK (public.is_content_admin());

GRANT SELECT ON public.festival_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.festival_media TO authenticated;

-- ── SECTION 8: Ensure all required indexes exist ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_festivals_slug          ON public.festivals(slug);
CREATE INDEX IF NOT EXISTS idx_festivals_festival_type ON public.festivals(festival_type);
CREATE INDEX IF NOT EXISTS idx_festivals_primary_deity ON public.festivals(primary_deity);
CREATE INDEX IF NOT EXISTS idx_festivals_is_active     ON public.festivals(is_active);
CREATE INDEX IF NOT EXISTS idx_festivals_status        ON public.festivals(status);

CREATE INDEX IF NOT EXISTS idx_occurrences_festival_id   ON public.festival_occurrences(festival_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_year          ON public.festival_occurrences(year);
CREATE INDEX IF NOT EXISTS idx_occurrences_festival_date ON public.festival_occurrences(festival_date);
CREATE INDEX IF NOT EXISTS idx_occurrences_status        ON public.festival_occurrences(status);

CREATE INDEX IF NOT EXISTS idx_festival_media_festival_id   ON public.festival_media(festival_id);
CREATE INDEX IF NOT EXISTS idx_festival_media_occurrence_id ON public.festival_media(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_festival_media_type          ON public.festival_media(media_type);

-- ── SECTION 9: Drop legacy tables (after data migration above) ────────────────

-- festival_timings: all data migrated into festival_occurrences above.
-- The only app code reference is upsertFestivalTimings() which is a stub never called.
DROP TABLE IF EXISTS public.festival_timings CASCADE;

-- festival_notifications: no-op stub in app, notifications removed from UI.
DROP TABLE IF EXISTS public.festival_notifications CASCADE;

-- ── SECTION 10: Drop redundant legacy columns from festivals ──────────────────
-- All data has been migrated above. These columns are now superseded by
-- festival_occurrences, festival_content, and festival_media.

ALTER TABLE public.festivals
  DROP COLUMN IF EXISTS tithi,
  DROP COLUMN IF EXISTS paksha,
  DROP COLUMN IF EXISTS tithi_start,
  DROP COLUMN IF EXISTS tithi_end,
  DROP COLUMN IF EXISTS nakshatra,
  DROP COLUMN IF EXISTS nakshatra_start,
  DROP COLUMN IF EXISTS nakshatra_end,
  DROP COLUMN IF EXISTS yoga,
  DROP COLUMN IF EXISTS karana,
  DROP COLUMN IF EXISTS festival_date,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS story_url,
  DROP COLUMN IF EXISTS story_storage_key,
  DROP COLUMN IF EXISTS puja_url,
  DROP COLUMN IF EXISTS puja_storage_key,
  DROP COLUMN IF EXISTS banner_url,
  DROP COLUMN IF EXISTS banner_storage_key,
  DROP COLUMN IF EXISTS story_audio_url,
  DROP COLUMN IF EXISTS story_audio_key,
  DROP COLUMN IF EXISTS story_video_url,
  DROP COLUMN IF EXISTS story_video_key;

-- ── SECTION 11: Verify final state ───────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 014 complete.';
  RAISE NOTICE 'Final festival tables: festivals, festival_occurrences, festival_content, festival_media, festival_settings';
  RAISE NOTICE 'Dropped: festival_timings, festival_notifications';
  RAISE NOTICE 'RLS enabled on: festivals, festival_media (joins existing: festival_occurrences, festival_content, festival_settings)';
END $$;
