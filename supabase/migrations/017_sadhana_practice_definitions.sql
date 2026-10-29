create table public.sadhana_practices (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 1000),
  category text not null check (
    category in ('meditation', 'japa', 'mantra', 'gratitude', 'scripture_reading')
  ),
  instructions text not null default '' check (char_length(instructions) <= 10000),
  target_count integer check (target_count between 1 and 100000),
  duration_minutes integer check (duration_minutes between 1 and 1440),
  media_url text check (
    media_url is null
    or (char_length(media_url) <= 2048 and media_url ~* '^https://')
  ),
  display_order integer not null default 0 check (display_order between 0 and 1000000),
  is_active boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (archived_at is null or is_active = false)
);

create index idx_sadhana_practices_active_order
  on public.sadhana_practices (display_order, name)
  where is_active = true and archived_at is null;

create index idx_sadhana_practices_category
  on public.sadhana_practices (category, display_order)
  where is_active = true and archived_at is null;

create or replace function public.set_sadhana_practice_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_sadhana_practices_updated_at
before update on public.sadhana_practices
for each row execute function public.set_sadhana_practice_updated_at();

alter table public.sadhana_practices enable row level security;

revoke all privileges on table public.sadhana_practices from public, anon, authenticated;
grant select on table public.sadhana_practices to anon, authenticated;
grant all privileges on table public.sadhana_practices to service_role;

create policy "Active sadhana practices are readable"
  on public.sadhana_practices
  for select
  to anon, authenticated
  using (is_active = true and archived_at is null);

