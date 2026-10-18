-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.banner_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT banner_images_pkey PRIMARY KEY (id)
);
-- !! RUN IN SUPABASE SQL EDITOR TO FIX 400 ERROR !!
-- ALTER TABLE public.banner_images DROP COLUMN IF EXISTS title;
-- ALTER TABLE public.banner_images DROP COLUMN IF EXISTS quote;
-- ALTER TABLE public.banner_images DROP COLUMN IF EXISTS quote_source;

CREATE TABLE public.daily_quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT ''::text,
  sanskrit text NOT NULL,
  source text NOT NULL DEFAULT ''::text,
  is_active boolean DEFAULT false,
  scheduled_at timestamp with time zone DEFAULT NULL,
  published boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_quotes_pkey PRIMARY KEY (id)
);
-- RUN IN SUPABASE SQL EDITOR:
-- ALTER TABLE public.daily_quotes ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
-- ALTER TABLE public.daily_quotes ADD COLUMN IF NOT EXISTS scheduled_at timestamptz DEFAULT NULL;
-- ALTER TABLE public.daily_quotes ADD COLUMN IF NOT EXISTS published boolean DEFAULT false;

-- quote_schedules: each row = one scheduled quote entry
CREATE TABLE public.quote_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  sloka text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '',
  meaning text DEFAULT '',
  language text DEFAULT 'Sanskrit',
  image_url text DEFAULT '',
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  scheduled_datetime timestamp with time zone NOT NULL,
  day_name text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','published','expired')),
  published_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quote_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT quote_schedules_unique_datetime UNIQUE (scheduled_datetime)
);
-- RUN IN SUPABASE SQL EDITOR:
-- CREATE TABLE IF NOT EXISTS public.quote_schedules (
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   title text NOT NULL DEFAULT '',
--   sloka text NOT NULL DEFAULT '',
--   source text NOT NULL DEFAULT '',
--   meaning text DEFAULT '',
--   language text DEFAULT 'Sanskrit',
--   image_url text DEFAULT '',
--   scheduled_date date NOT NULL,
--   scheduled_time time NOT NULL,
--   scheduled_datetime timestamptz NOT NULL,
--   day_name text NOT NULL,
--   status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','published','expired')),
--   published_at timestamptz DEFAULT NULL,
--   created_at timestamptz DEFAULT now(),
--   updated_at timestamptz DEFAULT now(),
--   CONSTRAINT quote_schedules_pkey PRIMARY KEY (id),
--   CONSTRAINT quote_schedules_unique_datetime UNIQUE (scheduled_datetime)
-- );
-- Enable RLS and allow anon read for user app:
-- ALTER TABLE public.quote_schedules ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "public read published" ON public.quote_schedules FOR SELECT USING (status = 'published');

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  mobile text DEFAULT ''::text,
  avatar_url text DEFAULT ''::text,
  day_streak integer DEFAULT 0,
  books_read integer DEFAULT 0,
  events_count integer DEFAULT 0,
  chant_count integer DEFAULT 108,
  bookmarks ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.emotions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tagline text,
  card_image_url text,
  banner_image_url text,
  outside_image_url text,
  gita_sanskrit text,
  gita_reference text,
  gita_transliteration text,
  gita_translation text,
  gita_image_url text,
  what_it_means text,
  means_image_url text,
  example_text text,
  example_image_url text,
  how_to_overcome jsonb DEFAULT '[]'::jsonb,
  mantra_sanskrit text,
  mantra_transliteration text,
  mantra_meaning text,
  mantra_image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT emotions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.sadhana_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  current_xp integer NOT NULL DEFAULT 0,
  level_number smallint NOT NULL DEFAULT 1,
  level_name text NOT NULL DEFAULT 'Temple Entrance'::text,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_completed_date date,
  today_date date NOT NULL DEFAULT CURRENT_DATE,
  today_meditation_done boolean NOT NULL DEFAULT false,
  today_japa_done boolean NOT NULL DEFAULT false,
  today_mantra_done boolean NOT NULL DEFAULT false,
  today_gratitude_done boolean NOT NULL DEFAULT false,
  completion_percentage smallint NOT NULL DEFAULT 0,
  total_meditation_sessions integer NOT NULL DEFAULT 0,
  total_meditation_minutes integer NOT NULL DEFAULT 0,
  total_japa_count integer NOT NULL DEFAULT 0,
  total_mantra_sessions integer NOT NULL DEFAULT 0,
  total_audio_minutes integer NOT NULL DEFAULT 0,
  total_gratitude_entries integer NOT NULL DEFAULT 0,
  milestones_achieved ARRAY NOT NULL DEFAULT '{}'::integer[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sadhana_progress_pkey PRIMARY KEY (id),
  CONSTRAINT sadhana_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.sadhana_practice_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  practice_type text NOT NULL CHECK (practice_type = ANY (ARRAY['meditation'::text, 'japa'::text, 'mantra'::text, 'gratitude'::text])),
  xp_awarded integer NOT NULL DEFAULT 0,
  duration_minutes integer,
  japa_count integer,
  listen_ratio numeric,
  level_at_time smallint NOT NULL DEFAULT 1,
  logged_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sadhana_practice_log_pkey PRIMARY KEY (id),
  CONSTRAINT sadhana_practice_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Admin CMS profiles. Passwords are managed exclusively by Supabase Auth.
CREATE TABLE public.admin_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  mobile text DEFAULT ''::text,
  role text NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'editor', 'viewer')),
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_users_pkey PRIMARY KEY (id)
);
-- See supabase/migrations/007_admin_auth.sql for the Auth trigger and RLS policy.

CREATE TABLE public.sadhana_milestones (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  streak_days integer NOT NULL,
  achieved_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sadhana_milestones_pkey PRIMARY KEY (id),
  CONSTRAINT sadhana_milestones_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
