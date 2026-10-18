-- ============================================================
-- Migration: Festival Management System
-- Run in Supabase SQL Editor
-- ============================================================

-- Core festivals table (lightweight — large content lives in R2)
CREATE TABLE IF NOT EXISTS public.festivals (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  name                text        NOT NULL DEFAULT '',
  alternate_name      text                 DEFAULT '',
  festival_type       text        NOT NULL DEFAULT 'Major Festival'
                                  CHECK (festival_type IN ('Major Festival','Ekadashi','Purnima','Amavasya','Jayanti','Vrata','Utsava','Other')),
  short_description   text                 DEFAULT '',
  description         text                 DEFAULT '',
  festival_date       date,
  start_date          date,
  end_date            date,
  -- Panchanga
  tithi               text                 DEFAULT '',
  paksha              text                 DEFAULT '' CHECK (paksha IN ('','Shukla Paksha','Krishna Paksha')),
  tithi_start         text                 DEFAULT '',
  tithi_end           text                 DEFAULT '',
  nakshatra           text                 DEFAULT '',
  yoga                text                 DEFAULT '',
  karana              text                 DEFAULT '',
  sunrise             text                 DEFAULT '',
  sunset              text                 DEFAULT '',
  moonrise            text                 DEFAULT '',
  moonset             text                 DEFAULT '',
  location            text                 DEFAULT '',
  timezone            text                 DEFAULT 'Asia/Kolkata',
  -- R2 references for large content
  story_url           text                 DEFAULT '',
  story_storage_key   text                 DEFAULT '',
  puja_url            text                 DEFAULT '',
  puja_storage_key    text                 DEFAULT '',
  -- Status
  status              text        NOT NULL DEFAULT 'Draft'
                                  CHECK (status IN ('Draft','Published','Archived')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT festivals_pkey PRIMARY KEY (id)
);

-- Deity relationships (references deity by id — no duplication)
CREATE TABLE IF NOT EXISTS public.festival_deities (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  festival_id uuid        NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  deity_name  text        NOT NULL DEFAULT '',
  deity_image_url text             DEFAULT '',
  deity_description text           DEFAULT '',
  is_primary  boolean     NOT NULL DEFAULT false,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT festival_deities_pkey PRIMARY KEY (id)
);

-- Regional information
CREATE TABLE IF NOT EXISTS public.festival_regions (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  festival_id   uuid        NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  region        text        NOT NULL DEFAULT '',
  regional_name text                 DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT festival_regions_pkey PRIMARY KEY (id)
);

-- Muhurat & timings (structured, panchanga-ready)
CREATE TABLE IF NOT EXISTS public.festival_timings (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  festival_id           uuid        NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  location              text                 DEFAULT '',
  timezone              text                 DEFAULT 'Asia/Kolkata',
  -- Day info
  sunrise               text                 DEFAULT '',
  sunset                text                 DEFAULT '',
  moonrise              text                 DEFAULT '',
  moonset               text                 DEFAULT '',
  day_duration          text                 DEFAULT '',
  night_duration        text                 DEFAULT '',
  -- Auspicious timings
  brahma_muhurta_start  text                 DEFAULT '',
  brahma_muhurta_end    text                 DEFAULT '',
  abhijit_start         text                 DEFAULT '',
  abhijit_end           text                 DEFAULT '',
  amrita_kalam_start    text                 DEFAULT '',
  amrita_kalam_end      text                 DEFAULT '',
  vijaya_start          text                 DEFAULT '',
  vijaya_end            text                 DEFAULT '',
  godhuli_start         text                 DEFAULT '',
  godhuli_end           text                 DEFAULT '',
  manchi_samayam_start  text                 DEFAULT '',
  manchi_samayam_end    text                 DEFAULT '',
  puja_start            text                 DEFAULT '',
  puja_end              text                 DEFAULT '',
  special_muhurta_start text                 DEFAULT '',
  special_muhurta_end   text                 DEFAULT '',
  -- Inauspicious timings
  rahu_kalam_start      text                 DEFAULT '',
  rahu_kalam_end        text                 DEFAULT '',
  yamagandam_start      text                 DEFAULT '',
  yamagandam_end        text                 DEFAULT '',
  gulika_start          text                 DEFAULT '',
  gulika_end            text                 DEFAULT '',
  dur_muhurta_start     text                 DEFAULT '',
  dur_muhurta_end       text                 DEFAULT '',
  varjyam_start         text                 DEFAULT '',
  varjyam_end           text                 DEFAULT '',
  -- Calculation metadata (for future Panchanga integration)
  calculation_source    text                 DEFAULT 'manual',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT festival_timings_pkey PRIMARY KEY (id)
);

-- Media references (all files live in R2)
CREATE TABLE IF NOT EXISTS public.festival_media (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  festival_id   uuid        NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  media_type    text        NOT NULL DEFAULT 'image'
                            CHECK (media_type IN ('banner','thumbnail','illustration','deity','story','puja','gallery','audio','video','notification')),
  storage_key   text        NOT NULL DEFAULT '',
  public_url    text        NOT NULL DEFAULT '',
  file_name     text                 DEFAULT '',
  mime_type     text                 DEFAULT '',
  file_size     bigint               DEFAULT 0,
  display_order integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT festival_media_pkey PRIMARY KEY (id)
);

-- Notification configuration
CREATE TABLE IF NOT EXISTS public.festival_notifications (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  festival_id         uuid        NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  enabled             boolean     NOT NULL DEFAULT false,
  title               text                 DEFAULT '',
  message             text                 DEFAULT '',
  image_url           text                 DEFAULT '',
  image_storage_key   text                 DEFAULT '',
  notify_before_days  integer     NOT NULL DEFAULT 1,
  notification_time   text                 DEFAULT '08:00',
  deep_link           text                 DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT festival_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT festival_notifications_festival_id_key UNIQUE (festival_id)
);

-- Home page / display settings
CREATE TABLE IF NOT EXISTS public.festival_settings (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  festival_id      uuid        NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  show_on_home     boolean     NOT NULL DEFAULT false,
  is_featured      boolean     NOT NULL DEFAULT false,
  priority         integer     NOT NULL DEFAULT 0,
  show_from        date,
  show_until       date,
  show_in_calendar boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT festival_settings_pkey PRIMARY KEY (id),
  CONSTRAINT festival_settings_festival_id_key UNIQUE (festival_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_festivals_status        ON public.festivals(status);
CREATE INDEX IF NOT EXISTS idx_festivals_festival_date ON public.festivals(festival_date);
CREATE INDEX IF NOT EXISTS idx_festivals_festival_type ON public.festivals(festival_type);
CREATE INDEX IF NOT EXISTS idx_festivals_created_at    ON public.festivals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_festival_settings_featured ON public.festival_settings(is_featured);
CREATE INDEX IF NOT EXISTS idx_festival_settings_home     ON public.festival_settings(show_on_home);
CREATE INDEX IF NOT EXISTS idx_festival_deities_festival ON public.festival_deities(festival_id);
CREATE INDEX IF NOT EXISTS idx_festival_regions_festival ON public.festival_regions(festival_id);
CREATE INDEX IF NOT EXISTS idx_festival_timings_festival ON public.festival_timings(festival_id);
CREATE INDEX IF NOT EXISTS idx_festival_media_festival   ON public.festival_media(festival_id);
CREATE INDEX IF NOT EXISTS idx_festival_notif_festival   ON public.festival_notifications(festival_id);
