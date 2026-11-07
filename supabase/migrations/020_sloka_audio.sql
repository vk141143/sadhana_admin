-- Migration 020: Sanskrit sloka audio uploads
-- Extends public.slokas with audio metadata columns.
-- Additive only — no existing rows, policies, or constraints are modified.
--
-- RLS inspection: existing policies in 010_scripture_catalog.sql and
-- 011_content_admin_policies.sql already cover all operations on public.slokas:
--   • "published slokas are readable"  — anon/authenticated SELECT on Published rows
--   • "sloka content admins"           — editor/super_admin full access via is_content_admin()
-- No new policies are required. The new columns are covered by the existing row-level grants.

alter table public.slokas
  add column if not exists audio_r2_path text
    check (audio_r2_path is null or (
      char_length(audio_r2_path) between 1 and 512
      and audio_r2_path like 'sloka-audio/%'
    )),
  add column if not exists audio_status text not null default 'not_uploaded'
    check (audio_status in ('not_uploaded', 'uploading', 'ready', 'error')),
  add column if not exists audio_duration_seconds numeric
    check (audio_duration_seconds is null or audio_duration_seconds >= 0),
  add column if not exists audio_file_size_bytes bigint
    check (audio_file_size_bytes is null or audio_file_size_bytes > 0),
  add column if not exists audio_updated_at timestamptz;

-- Partial index: only rows that actually have audio need fast lookup.
create index if not exists idx_slokas_audio_status
  on public.slokas (audio_status)
  where audio_status <> 'not_uploaded';

comment on column public.slokas.audio_r2_path          is 'R2 object key for the Sanskrit WAV audio file. Format: sloka-audio/{PREFIX}/{chapter}/{verse}.wav';
comment on column public.slokas.audio_status           is 'Upload lifecycle: not_uploaded | uploading | ready | error';
comment on column public.slokas.audio_duration_seconds is 'WAV duration in seconds, read from browser audio metadata after upload.';
comment on column public.slokas.audio_file_size_bytes  is 'Verified file size in bytes returned by the upload Edge Function.';
comment on column public.slokas.audio_updated_at       is 'Timestamp of the last audio metadata write.';
