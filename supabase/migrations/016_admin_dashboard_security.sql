-- Protect administrator profiles while preserving the server-side service-role
-- paths used by admin-session, publish-content, r2-upload and admin analytics.
alter table public.admin_users enable row level security;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_users'
  loop
    execute format('drop policy %I on public.admin_users', existing_policy.policyname);
  end loop;
end;
$$;

revoke all privileges on table public.admin_users from public, anon, authenticated;
grant all privileges on table public.admin_users to service_role;
grant select (id, full_name, email, mobile, role, is_active, created_at, updated_at)
  on table public.admin_users to authenticated;

create policy "Admins can read their own profile"
  on public.admin_users
  for select
  to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create index if not exists idx_users_created_at
  on public.users (created_at);
create index if not exists idx_sadhana_practice_log_logged_at
  on public.sadhana_practice_log (logged_at);

create or replace function public.admin_dashboard_metrics(p_days integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  end_date date;
  start_date date;
  result jsonb;
begin
  if p_days is null or p_days not in (7, 30, 90) then
    raise exception using errcode = '22023', message = 'Unsupported dashboard period.';
  end if;

  end_date := (now() at time zone 'UTC')::date;
  start_date := end_date - (p_days - 1);

  select jsonb_build_object(
    'days', p_days,
    'totalUsers', (select count(*) from public.users),
    'newUsers', (
      select count(*)
      from public.users
      where created_at >= (start_date::timestamp at time zone 'UTC')
        and created_at < ((end_date + 1)::timestamp at time zone 'UTC')
    ),
    'publishedScriptures', (
      select count(*) from public.scriptures where status = 'Published'
    ),
    'publishedChapters', (
      select count(*)
      from public.chapters c
      join public.scriptures s on s.id = c.scripture_id
      where c.status = 'Published' and s.status = 'Published'
    ),
    'publishedSlokas', (
      select count(*)
      from public.slokas v
      join public.chapters c on c.id = v.chapter_id
      join public.scriptures s on s.id = c.scripture_id
      where v.status = 'Published'
        and c.status = 'Published'
        and s.status = 'Published'
    ),
    'activeUsers', (
      select count(distinct user_id)
      from public.sadhana_practice_log
      where logged_at >= (start_date::timestamp at time zone 'UTC')
        and logged_at < ((end_date + 1)::timestamp at time zone 'UTC')
    ),
    'totalSadhanaSessions', (
      select count(*) from public.sadhana_practice_log
    ),
    'dailyEngagement', (
      select jsonb_agg(
        jsonb_build_object(
          'date', to_char(day_bucket.day, 'YYYY-MM-DD'),
          'sessions', coalesce(activity.sessions, 0),
          'newUsers', coalesce(registrations.new_users, 0)
        )
        order by day_bucket.day
      )
      from generate_series(start_date, end_date, interval '1 day') as day_bucket(day)
      left join (
        select (logged_at at time zone 'UTC')::date as activity_date, count(*) as sessions
        from public.sadhana_practice_log
        where logged_at >= (start_date::timestamp at time zone 'UTC')
          and logged_at < ((end_date + 1)::timestamp at time zone 'UTC')
        group by (logged_at at time zone 'UTC')::date
      ) activity on activity.activity_date = day_bucket.day::date
      left join (
        select (created_at at time zone 'UTC')::date as registration_date, count(*) as new_users
        from public.users
        where created_at >= (start_date::timestamp at time zone 'UTC')
          and created_at < ((end_date + 1)::timestamp at time zone 'UTC')
        group by (created_at at time zone 'UTC')::date
      ) registrations on registrations.registration_date = day_bucket.day::date
    ),
    'practiceCategories', (
      select jsonb_agg(
        jsonb_build_object(
          'category', categories.practice_type,
          'sessions', coalesce(category_counts.sessions, 0)
        )
        order by categories.sort_order
      )
      from (values
        ('meditation'::text, 1),
        ('japa'::text, 2),
        ('mantra'::text, 3),
        ('gratitude'::text, 4)
      ) as categories(practice_type, sort_order)
      left join (
        select practice_type, count(*) as sessions
        from public.sadhana_practice_log
        where logged_at >= (start_date::timestamp at time zone 'UTC')
          and logged_at < ((end_date + 1)::timestamp at time zone 'UTC')
        group by practice_type
      ) category_counts on category_counts.practice_type = categories.practice_type
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_dashboard_metrics(integer) from public, anon, authenticated;
grant execute on function public.admin_dashboard_metrics(integer) to service_role;
