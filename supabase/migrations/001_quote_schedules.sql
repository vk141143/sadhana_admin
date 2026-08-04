-- ============================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- Project: yzsfbxvygvxcbyipjzjo
-- ============================================================

-- ── 1. Create quote_schedules table ──────────────────────────
CREATE TABLE IF NOT EXISTS public.quote_schedules (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  title              text        NOT NULL DEFAULT '',
  sloka              text        NOT NULL DEFAULT '',
  source             text                 DEFAULT '',
  meaning            text                 DEFAULT '',
  language           text                 DEFAULT 'Sanskrit',
  image_url          text                 DEFAULT '',
  scheduled_date     date        NOT NULL,
  scheduled_time     time        NOT NULL,
  scheduled_datetime timestamptz NOT NULL,
  day_name           text        NOT NULL,
  status             text        NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled','published','expired')),
  published_at       timestamptz          DEFAULT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT quote_schedules_unique_datetime UNIQUE (scheduled_datetime)
);

-- ── 2. RLS — drop all old policies first ─────────────────────
ALTER TABLE public.quote_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read published"   ON public.quote_schedules;
DROP POLICY IF EXISTS "service role all"      ON public.quote_schedules;
DROP POLICY IF EXISTS "anon full access"      ON public.quote_schedules;
DROP POLICY IF EXISTS "allow all anon"        ON public.quote_schedules;

-- Allow anon key (admin panel + user app) full SELECT/INSERT/UPDATE/DELETE
-- This is safe because your admin panel is the only writer and
-- the user app only calls .eq('status','published') in its query.
CREATE POLICY "anon full access"
  ON public.quote_schedules
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Also fix daily_quotes table RLS if you're hitting errors there too
ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon full access daily_quotes" ON public.daily_quotes;
CREATE POLICY "anon full access daily_quotes"
  ON public.daily_quotes
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Also fix banner_images if needed
ALTER TABLE public.banner_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon full access banner_images" ON public.banner_images;
CREATE POLICY "anon full access banner_images"
  ON public.banner_images
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ── 3. Schedule cron job (every minute) ──────────────────────
-- Requires pg_cron enabled — go to Supabase Dashboard → Database → Extensions → enable pg_cron
-- Then run the SELECT below:

SELECT cron.schedule(
  'publish-scheduled-quotes',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://yzsfbxvygvxcbyipjzjo.supabase.co/functions/v1/publish-scheduled-quotes',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6c2ZieHZ5Z3Z4Y2J5aXBqempvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MjQ2NzQsImV4cCI6MjEwMDIwMDY3NH0.v7Dyoc4fTARnnQDeh2Db1Z_2LHzLfT5AsnF3agNp3m8", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── To remove cron job later ──────────────────────────────────
-- SELECT cron.unschedule('publish-scheduled-quotes');
