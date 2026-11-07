SELECT jsonb_build_object('columns', (SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns WHERE table_schema='public'
AND table_name IN ('festivals','festival_occurrences','festival_content','festival_settings','festival_media','admin_users') ORDER BY table_name,ordinal_position) x),
'triggers', (SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (SELECT c.relname, t.tgname, p.proname, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid
WHERE NOT t.tgisinternal AND c.relnamespace='public'::regnamespace
AND c.relname IN ('festivals','festival_occurrences','festival_content','festival_media','festival_settings')) x),
'policies', (SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies
WHERE schemaname='public' AND tablename IN ('festivals','festival_occurrences','festival_content','festival_settings','festival_media')) x),
'authorization', (SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (SELECT pg_get_functiondef('public.is_content_admin()'::regprocedure)) x),
'history', (SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (SELECT to_regclass('supabase_migrations.schema_migrations') AS migration_history_table) x)) AS inspection;