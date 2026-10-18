-- Repair the Auth signup trigger for existing admin_users tables.
-- This version intentionally does not depend on a UNIQUE(email) constraint,
-- which is a common reason an `ON CONFLICT (email)` trigger fails with a 500.

create or replace function public.handle_new_admin_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If the email already exists in admin_users, preserve its role and active
  -- status. This lets an existing administrator be moved to Supabase Auth.
  update public.admin_users
     set full_name = coalesce(new.raw_user_meta_data ->> 'full_name', full_name),
         mobile = coalesce(new.raw_user_meta_data ->> 'mobile', mobile),
         updated_at = now()
   where lower(email) = lower(new.email);

  -- A brand-new signup receives no CMS privileges until it is approved.
  if not found then
    insert into public.admin_users (
      full_name, email, mobile, role, password_hash, is_active
    ) values (
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
      lower(new.email),
      coalesce(new.raw_user_meta_data ->> 'mobile', ''),
      'viewer',
      'managed_by_supabase_auth',
      false
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_admin_auth_user_created on auth.users;
create trigger on_admin_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_admin_auth_user();
