-- ============================================================
-- Migration: albums + audio_tracks
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.albums (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  title       text        NOT NULL DEFAULT '',
  artist      text        NOT NULL DEFAULT '',
  description text                 DEFAULT '',
  cover_url   text                 DEFAULT '',
  status      text        NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Premium','Public')),
  track_count integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT albums_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.audio_tracks (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  title      text        NOT NULL DEFAULT '',
  artist     text        NOT NULL DEFAULT '',
  album_id   uuid        REFERENCES public.albums(id) ON DELETE SET NULL,
  language   text                 DEFAULT 'Sanskrit',
  duration   text                 DEFAULT '0:00',
  is_premium boolean     NOT NULL DEFAULT false,
  audio_url  text                 DEFAULT '',
  status     text        NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Draft')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audio_tracks_pkey PRIMARY KEY (id)
);

-- Auto-update track_count on albums
CREATE OR REPLACE FUNCTION update_album_track_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.album_id IS NOT NULL THEN
    UPDATE public.albums SET track_count = track_count + 1 WHERE id = NEW.album_id;
  ELSIF TG_OP = 'DELETE' AND OLD.album_id IS NOT NULL THEN
    UPDATE public.albums SET track_count = GREATEST(track_count - 1, 0) WHERE id = OLD.album_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_album_track_count ON public.audio_tracks;
CREATE TRIGGER trg_album_track_count
AFTER INSERT OR DELETE ON public.audio_tracks
FOR EACH ROW EXECUTE FUNCTION update_album_track_count();

-- RLS
ALTER TABLE public.albums       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon full access albums"       ON public.albums;
DROP POLICY IF EXISTS "anon full access audio_tracks" ON public.audio_tracks;

CREATE POLICY "anon full access albums"
  ON public.albums FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon full access audio_tracks"
  ON public.audio_tracks FOR ALL TO anon USING (true) WITH CHECK (true);
