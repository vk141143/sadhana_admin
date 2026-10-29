-- Migration 019: Extended fields for Sadhana Practice Definition Builder
-- All changes are additive (nullable or defaulted). No destructive operations.

alter table public.sadhana_practices
  add column if not exists subtitle text
    check (subtitle is null or char_length(btrim(subtitle)) between 1 and 200),
  add column if not exists difficulty text
    check (difficulty is null or difficulty in ('beginner', 'intermediate', 'advanced')),
  add column if not exists practice_mode text
    check (practice_mode is null or practice_mode in (
      'timer', 'repetition', 'guided_audio', 'reflection', 'scripture_reading'
    )),
  add column if not exists target_type text
    check (target_type is null or target_type in (
      'none', 'duration', 'repetitions', 'entries', 'verses', 'chapters'
    )),
  add column if not exists target_unit text
    check (target_unit is null or char_length(btrim(target_unit)) between 1 and 40),
  add column if not exists completion_rule text
    check (completion_rule is null or completion_rule in (
      'manual', 'timer_elapsed', 'repetitions_reached', 'entries_submitted', 'audio_completed'
    )),
  add column if not exists time_of_day text
    check (time_of_day is null or time_of_day in ('morning', 'afternoon', 'evening', 'anytime')),
  add column if not exists is_featured boolean not null default false,
  add column if not exists benefits jsonb
    check (benefits is null or (jsonb_typeof(benefits) = 'array' and jsonb_array_length(benefits) <= 20)),
  add column if not exists tags jsonb
    check (tags is null or (jsonb_typeof(tags) = 'array' and jsonb_array_length(tags) <= 30)),
  add column if not exists category_config jsonb,
  add column if not exists cover_image_url text
    check (cover_image_url is null or (char_length(cover_image_url) <= 2048 and cover_image_url ~* '^https://')),
  add column if not exists guided_audio_url text
    check (guided_audio_url is null or (char_length(guided_audio_url) <= 2048 and guided_audio_url ~* '^https://')),
  add column if not exists ambient_audio_url text
    check (ambient_audio_url is null or (char_length(ambient_audio_url) <= 2048 and ambient_audio_url ~* '^https://'));

create index if not exists idx_sadhana_practices_featured
  on public.sadhana_practices (display_order, name)
  where is_active = true and archived_at is null and is_featured = true;

create index if not exists idx_sadhana_practices_difficulty
  on public.sadhana_practices (difficulty, display_order)
  where is_active = true and archived_at is null and difficulty is not null;

comment on column public.sadhana_practices.subtitle is 'Short subtitle shown below the practice name.';
comment on column public.sadhana_practices.difficulty is 'Skill level: beginner, intermediate, or advanced.';
comment on column public.sadhana_practices.practice_mode is 'Determines which completion UI the customer app renders.';
comment on column public.sadhana_practices.target_type is 'What the target_count value measures.';
comment on column public.sadhana_practices.target_unit is 'Human-readable unit label shown alongside the target value.';
comment on column public.sadhana_practices.completion_rule is 'How the customer app determines that a session is complete.';
comment on column public.sadhana_practices.time_of_day is 'Recommended time of day for this practice.';
comment on column public.sadhana_practices.is_featured is 'Whether this practice is highlighted in the customer catalogue.';
comment on column public.sadhana_practices.benefits is 'Ordered list of benefit strings shown in the customer detail view.';
comment on column public.sadhana_practices.tags is 'Lowercase tag strings for filtering and discovery.';
comment on column public.sadhana_practices.category_config is 'Category-specific configuration (mantra text, japa preset, reflection prompts, scripture ref, etc.).';
comment on column public.sadhana_practices.cover_image_url is 'Cover/thumbnail image URL, separate from the legacy media_url field.';
comment on column public.sadhana_practices.guided_audio_url is 'Guided audio track URL for guided_audio and meditation modes.';
comment on column public.sadhana_practices.ambient_audio_url is 'Optional ambient/background audio URL for meditation and timer modes.';
