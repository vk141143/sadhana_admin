-- Allow active content admins to manage the scripture catalog used by ContentView.
-- Public clients can only read published content.

create or replace function public.is_content_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
      and is_active = true
      and role in ('super_admin', 'editor')
  );
$$;

revoke all on function public.is_content_admin() from public;
grant execute on function public.is_content_admin() to authenticated;

grant select on public.scriptures, public.chapters, public.slokas to anon, authenticated;
grant insert, update, delete on public.scriptures, public.chapters, public.slokas to authenticated;

drop policy if exists "published scriptures are readable" on public.scriptures;
create policy "published scriptures are readable"
  on public.scriptures for select
  to anon, authenticated
  using (status = 'Published');

drop policy if exists "scripture content admins" on public.scriptures;
create policy "scripture content admins"
  on public.scriptures for all
  to authenticated
  using (public.is_content_admin())
  with check (public.is_content_admin());

drop policy if exists "published chapters are readable" on public.chapters;
create policy "published chapters are readable"
  on public.chapters for select
  to anon, authenticated
  using (
    status = 'Published'
    and exists (
      select 1
      from public.scriptures
      where scriptures.id = chapters.scripture_id
        and scriptures.status = 'Published'
    )
  );

drop policy if exists "chapter content admins" on public.chapters;
create policy "chapter content admins"
  on public.chapters for all
  to authenticated
  using (public.is_content_admin())
  with check (public.is_content_admin());

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

drop policy if exists "sloka content admins" on public.slokas;
create policy "sloka content admins"
  on public.slokas for all
  to authenticated
  using (public.is_content_admin())
  with check (public.is_content_admin());