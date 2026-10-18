-- ============================================================
-- Migration 015: Festival Occurrence Final Cleanup
--
-- Removes obsolete columns from public.festival_occurrences.
-- All removed columns are confirmed unused by application code.
--
-- COLUMNS REMOVED:
--   Panchanga detail timestamps : tithi_start, tithi_end,
--                                  nakshatra_start, nakshatra_end,
--                                  yoga_start, yoga_end,
--                                  karana_name, karana_start, karana_end
--   Unused timing               : manchi_samayam_start, manchi_samayam_end
--   Calculation info            : calculation_city, calculation_latitude,
--                                  calculation_longitude, timezone
--   Unused fasting fields       : fasting_start, fasting_end, parana_date
--
-- COLUMNS RETAINED (final schema):
--   id, festival_id, year, festival_date
--   tithi_name, paksha, nakshatra_name, yoga_name
--   shubha_muhurta_start/end, puja_time_start/end
--   rahu_kalam_start/end, yamagandam_start/end, gulika_kalam_start/end
--   fasting_enabled, fasting_type, parana_required, parana_time, fasting_rules
--   custom_timings
--   status, created_by, updated_by, published_by, published_at
--   created_at, updated_at
--
-- UNIQUE(festival_id, year) constraint is preserved.
-- No records are deleted. No tables are dropped or recreated.
-- ============================================================

ALTER TABLE public.festival_occurrences
  -- Panchanga detail timestamps (UI removed; DB columns dropped)
  DROP COLUMN IF EXISTS tithi_start,
  DROP COLUMN IF EXISTS tithi_end,
  DROP COLUMN IF EXISTS nakshatra_start,
  DROP COLUMN IF EXISTS nakshatra_end,
  DROP COLUMN IF EXISTS yoga_start,
  DROP COLUMN IF EXISTS yoga_end,
  DROP COLUMN IF EXISTS karana_name,
  DROP COLUMN IF EXISTS karana_start,
  DROP COLUMN IF EXISTS karana_end,
  -- Unused timing
  DROP COLUMN IF EXISTS manchi_samayam_start,
  DROP COLUMN IF EXISTS manchi_samayam_end,
  -- Calculation information (removed from architecture)
  DROP COLUMN IF EXISTS calculation_city,
  DROP COLUMN IF EXISTS calculation_latitude,
  DROP COLUMN IF EXISTS calculation_longitude,
  DROP COLUMN IF EXISTS timezone,
  -- Unused fasting date/time fields
  DROP COLUMN IF EXISTS fasting_start,
  DROP COLUMN IF EXISTS fasting_end,
  DROP COLUMN IF EXISTS parana_date;

-- ── Verify final state ────────────────────────────────────────────────────────
DO $$
DECLARE
  col_count integer;
BEGIN
  -- Confirm the 5 festival tables exist
  ASSERT (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('festivals','festival_occurrences','festival_content','festival_media','festival_settings')
  ) = 5, 'Expected 5 festival tables';

  -- Confirm legacy tables are gone
  ASSERT (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('festival_timings','festival_notifications')
  ) = 0, 'Legacy tables festival_timings / festival_notifications must not exist';

  -- Confirm removed columns are gone
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'festival_occurrences'
    AND column_name IN (
      'tithi_start','tithi_end',
      'nakshatra_start','nakshatra_end',
      'yoga_start','yoga_end',
      'karana_name','karana_start','karana_end',
      'manchi_samayam_start','manchi_samayam_end',
      'calculation_city','calculation_latitude','calculation_longitude','timezone',
      'fasting_start','fasting_end','parana_date'
    );
  ASSERT col_count = 0, 'Obsolete columns still present in festival_occurrences';

  -- Confirm key retained columns still exist
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'festival_occurrences'
    AND column_name IN (
      'id','festival_id','year','festival_date',
      'tithi_name','paksha','nakshatra_name','yoga_name',
      'shubha_muhurta_start','shubha_muhurta_end',
      'puja_time_start','puja_time_end',
      'rahu_kalam_start','rahu_kalam_end',
      'yamagandam_start','yamagandam_end',
      'gulika_kalam_start','gulika_kalam_end',
      'fasting_enabled','fasting_type',
      'parana_required','parana_time','fasting_rules',
      'custom_timings','status',
      'created_at','updated_at'
    );
  ASSERT col_count = 27, 'One or more required columns missing from festival_occurrences';

  RAISE NOTICE 'Migration 015 complete.';
  RAISE NOTICE '5 festival tables confirmed: festivals, festival_occurrences, festival_content, festival_media, festival_settings';
  RAISE NOTICE '18 obsolete columns removed from festival_occurrences.';
  RAISE NOTICE 'All required columns retained.';
END $$;
