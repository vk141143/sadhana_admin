-- ============================================================
-- FIX: admin_users auth integration
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- 1. Make password_hash optional (it's managed by Supabase Auth, not us)
ALTER TABLE public.admin_users
  ALTER COLUMN password_hash SET DEFAULT '',
  ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Drop old trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_admin_user();

-- 3. Create function to auto-insert into admin_users on signup
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_users (
    id,
    full_name,
    email,
    mobile,
    role,
    password_hash,
    is_active
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
    'editor',       -- default role; super_admin must upgrade manually
    '',             -- password managed by Supabase Auth
    false           -- inactive until super_admin approves
  )
  ON CONFLICT (email) DO NOTHING;  -- skip if already exists

  RETURN NEW;
END;
$$;

-- 4. Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_admin_user();

-- 5. Enable RLS on admin_users (if not already)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 6. Allow authenticated users to read their own row
DROP POLICY IF EXISTS "admin can read own profile" ON public.admin_users;
CREATE POLICY "admin can read own profile"
  ON public.admin_users
  FOR SELECT
  USING (auth.uid() = id OR auth.role() = 'service_role');

-- ============================================================
-- OPTIONAL: Manually activate a super_admin after first signup
-- Replace the email below with your actual admin email
-- ============================================================
-- UPDATE public.admin_users
--   SET role = 'super_admin', is_active = true
--   WHERE email = 'your-admin@email.com';
