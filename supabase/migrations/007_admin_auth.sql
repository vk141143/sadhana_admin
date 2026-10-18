-- Use Supabase Auth for all credentials. `admin_users` stores only the admin
-- profile, active state, and role. No Edge Function or browser-side password
-- comparison is involved.

alter table public.admin_users enable row level security;

drop policy if exists "Admins can read their own profile" on public.admin_users;
create policy "Admins can read their own profile"
  on public.admin_users
  for select
  to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Creates the profile whenever an account is registered through Supabase Auth.
-- New accounts are viewers until an existing super_admin promotes and activates
-- them. This prevents anyone on the internet from self-registering as an admin.
create or replace function public.handle_new_admin_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.admin_users (
    full_name, email, mobile, role, password_hash, is_active
  ) values (
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'mobile', ''),
    'viewer',
    'managed_by_supabase_auth',
    false
  )
  on conflict (email) do update
    set full_name = excluded.full_name,
        mobile = excluded.mobile,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_admin_auth_user_created on auth.users;
create trigger on_admin_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_admin_auth_user();

-- After someone registers, a super admin can approve them, for example:
-- update public.admin_users
-- set role = 'editor', is_active = true, updated_at = now()
-- where email = 'new-admin@example.com';
