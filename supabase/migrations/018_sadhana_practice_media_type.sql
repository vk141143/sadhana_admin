alter table public.sadhana_practices
  add column media_type text
  check (media_type in ('image', 'audio'));

comment on column public.sadhana_practices.media_type is
  'Optional kind for the practice media URL; null represents no declared media type or a legacy URL.';
