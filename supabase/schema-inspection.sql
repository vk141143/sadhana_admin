-- Read-only inventory. Run only in an authorized database session.
-- Does not return customer records, credentials or admin profile data.
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (table_name in ('admin_users','users','scriptures','chapters','slokas','festival_occurrences',
    'user_preferences','reading_progress','bookmarks')
    or table_name like 'chant_%' or table_name like '%sadhana%' or table_name like '%meditation%')
order by table_name, ordinal_position;

select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r','p')
  and c.relname in ('admin_users','users','sadhana_progress','sadhana_practice_log',
    'sadhana_practices','scriptures','chapters','slokas')
order by c.relname;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'admin_users'
  and grantee in ('anon','authenticated','service_role')
order by grantee, privilege_type;

select routine_name, data_type, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('chant_analytics','chant_customer_totals','chant_session_action',
    'handle_new_admin_auth_user','is_content_admin','admin_dashboard_metrics');

select event_object_schema, event_object_table, trigger_name, action_statement
from information_schema.triggers
where event_object_schema in ('auth','public')
  and event_object_table in ('users','admin_users');
