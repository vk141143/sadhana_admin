-- User-specific reading preferences, progress, and bookmarks.
-- These tables intentionally sit beside the admin/content catalog and do not
-- duplicate the published scripture/chapter/sloka content model.

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_reading_language text not null default 'en',
  updated_at timestamptz not null default now()
);

create table if not exists public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scripture_id uuid not null,
  chapter_id uuid not null,
  last_verse_number integer not null default 1,
  language text not null default 'en',
  updated_at timestamptz not null default now(),
  unique (user_id, scripture_id, chapter_id)
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scripture_id uuid not null,
  chapter_id uuid not null,
  verse_id text not null,
  verse_number integer not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, verse_id)
);

alter table public.user_preferences enable row level security;
alter table public.reading_progress enable row level security;
alter table public.bookmarks enable row level security;

create policy "Users can manage own preferences"
on public.user_preferences
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can manage own reading progress"
on public.reading_progress
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can manage own bookmarks"
on public.bookmarks
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
