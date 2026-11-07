SELECT jsonb_build_object(
  'migration', (SELECT jsonb_agg(version) FROM supabase_migrations.schema_migrations WHERE version='023'),
  'wizard_state', (SELECT jsonb_build_object('type',data_type,'nullable',is_nullable,'default',column_default)
    FROM information_schema.columns WHERE table_schema='public' AND table_name='festivals' AND column_name='wizard_state'),
  'fixtures', (SELECT jsonb_agg(jsonb_build_object('id',f.id,'status',f.status,'active',f.is_active,
    'step',f.wizard_state->>'step','occurrences',(SELECT count(*) FROM public.festival_occurrences o WHERE o.festival_id=f.id),
    'content',(SELECT count(*) FROM public.festival_content c WHERE c.festival_id=f.id),
    'settings',(SELECT count(*) FROM public.festival_settings s WHERE s.festival_id=f.id),
    'media',(SELECT count(*) FROM public.festival_media m WHERE m.festival_id=f.id)))
    FROM public.festivals f WHERE id IN ('98bfd392-012d-4e62-9969-7c1c9ac01297','a1731fc0-27e0-4224-a961-a64d40abc786','a70335d3-769a-46b8-837a-31e6d294bb36')),
  'test_accounts', (SELECT jsonb_agg(jsonb_build_object('auth_id',u.id,'admin_active',a.is_active,'banned',u.banned_until>now()))
    FROM auth.users u JOIN public.admin_users a ON a.email=u.email
    WHERE u.id IN ('06508aa7-b4c2-4ebd-acdd-e11dde1d08c0','63b0fe97-86f6-4340-b17e-19942e95b93c','149e5cc9-027f-4389-b893-79853da7df3f')),
  'wizard_security', (SELECT jsonb_build_object('security_definer',p.prosecdef,
    'anonymous_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
    'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'))
    FROM pg_proc p WHERE p.oid='public.save_festival_wizard(uuid,jsonb,jsonb,jsonb,jsonb,text,integer)'::regprocedure)
) AS audit;
