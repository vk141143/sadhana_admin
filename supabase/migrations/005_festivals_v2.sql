-- ============================================================
-- Migration 005: Festival schema cleanup
-- Drops unused tables/columns, adds new required columns.
-- Run in Supabase SQL Editor AFTER 004_festivals.sql
-- ============================================================

-- ── 1. Drop unused tables (deity & regional — removed from wizard) ────────────
DROP TABLE IF EXISTS public.festival_deities  CASCADE;
DROP TABLE IF EXISTS public.festival_regions  CASCADE;

-- ── 2. Drop unused columns from festivals ────────────────────────────────────
ALTER TABLE public.festivals
  DROP COLUMN IF EXISTS start_date,
  DROP COLUMN IF EXISTS end_date,
  DROP COLUMN IF EXISTS sunrise,
  DROP COLUMN IF EXISTS sunset,
  DROP COLUMN IF EXISTS moonrise,
  DROP COLUMN IF EXISTS moonset,
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS timezone;

-- ── 3. Add new columns to festivals ──────────────────────────────────────────
ALTER TABLE public.festivals
  ADD COLUMN IF NOT EXISTS banner_url        text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS banner_storage_key text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nakshatra_start   text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nakshatra_end     text NOT NULL DEFAULT '';

-- ── 4. Drop unused columns from festival_timings ─────────────────────────────
ALTER TABLE public.festival_timings
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS timezone,
  DROP COLUMN IF EXISTS sunrise,
  DROP COLUMN IF EXISTS sunset,
  DROP COLUMN IF EXISTS moonrise,
  DROP COLUMN IF EXISTS moonset,
  DROP COLUMN IF EXISTS day_duration,
  DROP COLUMN IF EXISTS night_duration,
  DROP COLUMN IF EXISTS brahma_muhurta_start,
  DROP COLUMN IF EXISTS brahma_muhurta_end,
  DROP COLUMN IF EXISTS abhijit_start,
  DROP COLUMN IF EXISTS abhijit_end,
  DROP COLUMN IF EXISTS amrita_kalam_start,
  DROP COLUMN IF EXISTS amrita_kalam_end,
  DROP COLUMN IF EXISTS vijaya_start,
  DROP COLUMN IF EXISTS vijaya_end,
  DROP COLUMN IF EXISTS godhuli_start,
  DROP COLUMN IF EXISTS godhuli_end,
  DROP COLUMN IF EXISTS dur_muhurta_start,
  DROP COLUMN IF EXISTS dur_muhurta_end,
  DROP COLUMN IF EXISTS varjyam_start,
  DROP COLUMN IF EXISTS varjyam_end,
  DROP COLUMN IF EXISTS calculation_source;

-- ── 5. Add parana_time to festival_timings ────────────────────────────────────
ALTER TABLE public.festival_timings
  ADD COLUMN IF NOT EXISTS parana_time text NOT NULL DEFAULT '';

-- ── 6. Rename special_muhurta → shubha_muhurta (clearer naming) ──────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'festival_timings' AND column_name = 'special_muhurta_start'
  ) THEN
    ALTER TABLE public.festival_timings
      RENAME COLUMN special_muhurta_start TO shubha_muhurta_start;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'festival_timings' AND column_name = 'special_muhurta_end'
  ) THEN
    ALTER TABLE public.festival_timings
      RENAME COLUMN special_muhurta_end TO shubha_muhurta_end;
  END IF;
END $$;

-- ── 7. Update festival_media allowed types ────────────────────────────────────
-- Drop old check constraint and add updated one
ALTER TABLE public.festival_media
  DROP CONSTRAINT IF EXISTS festival_media_media_type_check;

ALTER TABLE public.festival_media
  ADD CONSTRAINT festival_media_media_type_check
  CHECK (media_type IN ('banner','gallery','audio','video','story_json','puja_json','notification'));

-- ── 8. Store media URLs directly on festivals for fast access ─────────────────
ALTER TABLE public.festivals
  ADD COLUMN IF NOT EXISTS story_audio_url      text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS story_audio_key      text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS story_video_url      text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS story_video_key      text NOT NULL DEFAULT '';

-- ── 9. Rebuild indexes ────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_festival_deities_festival;
DROP INDEX IF EXISTS idx_festival_regions_festival;

CREATE INDEX IF NOT EXISTS idx_festivals_status        ON public.festivals(status);
CREATE INDEX IF NOT EXISTS idx_festivals_festival_date ON public.festivals(festival_date);
CREATE INDEX IF NOT EXISTS idx_festivals_festival_type ON public.festivals(festival_type);
CREATE INDEX IF NOT EXISTS idx_festivals_created_at    ON public.festivals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_festival_settings_home  ON public.festival_settings(show_on_home);
CREATE INDEX IF NOT EXISTS idx_festival_timings_festival ON public.festival_timings(festival_id);
CREATE INDEX IF NOT EXISTS idx_festival_media_festival   ON public.festival_media(festival_id);
CREATE INDEX IF NOT EXISTS idx_festival_media_type       ON public.festival_media(festival_id, media_type);
CREATE INDEX IF NOT EXISTS idx_festival_notif_festival   ON public.festival_notifications(festival_id);

-- ── 10. updated_at trigger ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_festivals_updated_at        ON public.festivals;
DROP TRIGGER IF EXISTS trg_festival_timings_updated_at ON public.festival_timings;

CREATE TRIGGER trg_festivals_updated_at
  BEFORE UPDATE ON public.festivals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_festival_timings_updated_at
  BEFORE UPDATE ON public.festival_timings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
