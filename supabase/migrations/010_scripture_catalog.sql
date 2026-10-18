-- Scripture catalog used by the Content editor and the user Library.
-- Keep this migration in the deployable Supabase migration directory.

create table if not exists public.scriptures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  cover_image_url text not null default '',
  status text not null default 'Draft' check (status in ('Draft', 'Published', 'Archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  scripture_id uuid not null references public.scriptures(id) on delete cascade,
  chapter_number integer not null check (chapter_number > 0),
  title text not null,
  subtitle text not null default '',
  description text not null default '',
  image_url text not null default '',
  sloka_count integer not null default 0,
  status text not null default 'Draft' check (status in ('Draft', 'Published', 'Archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scripture_id, chapter_number)
);

create table if not exists public.slokas (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  verse_number integer not null check (verse_number > 0),
  verse_id text not null,
  json_url text not null,
  status text not null default 'Published' check (status in ('Draft', 'Published', 'Archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_id, verse_number),
  unique (chapter_id, verse_id)
);

create index if not exists idx_chapters_scripture_id on public.chapters(scripture_id);
create index if not exists idx_slokas_chapter_id on public.slokas(chapter_id);

create or replace function public.set_scripture_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_scriptures_updated_at on public.scriptures;
create trigger trg_scriptures_updated_at
before update on public.scriptures
for each row execute function public.set_scripture_updated_at();

drop trigger if exists trg_chapters_updated_at on public.chapters;
create trigger trg_chapters_updated_at
before update on public.chapters
for each row execute function public.set_scripture_updated_at();

drop trigger if exists trg_slokas_updated_at on public.slokas;
create trigger trg_slokas_updated_at
before update on public.slokas
for each row execute function public.set_scripture_updated_at();

alter table public.scriptures enable row level security;
alter table public.chapters enable row level security;
alter table public.slokas enable row level security;

drop policy if exists "published scriptures are readable" on public.scriptures;
create policy "published scriptures are readable"
on public.scriptures for select
to anon, authenticated
using (status = 'Published');

drop policy if exists "published chapters are readable" on public.chapters;
create policy "published chapters are readable"
on public.chapters for select
to anon, authenticated
using (
  status = 'Published'
  and exists (
    select 1 from public.scriptures
    where scriptures.id = chapters.scripture_id
      and scriptures.status = 'Published'
  )
);

drop policy if exists "published slokas are readable" on public.slokas;
create policy "published slokas are readable"
on public.slokas for select
to anon, authenticated
using (
  status = 'Published'
  and exists (
    select 1
    from public.chapters
    join public.scriptures on scriptures.id = chapters.scripture_id
    where chapters.id = slokas.chapter_id
      and chapters.status = 'Published'
      and scriptures.status = 'Published'
  )
);

-- Preserve CMS access for active editors and super admins.
drop policy if exists "scripture content admins" on public.scriptures;
create policy "scripture content admins" on public.scriptures
for all to authenticated
using (public.is_content_admin())
with check (public.is_content_admin());

drop policy if exists "chapter content admins" on public.chapters;
create policy "chapter content admins" on public.chapters
for all to authenticated
using (public.is_content_admin())
with check (public.is_content_admin());

drop policy if exists "sloka content admins" on public.slokas;
create policy "sloka content admins" on public.slokas
for all to authenticated
using (public.is_content_admin())
with check (public.is_content_admin());