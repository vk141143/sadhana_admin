-- Atomic persistence for the existing nine-step wizard. No records are removed.
BEGIN;
ALTER TABLE public.festivals ADD COLUMN IF NOT EXISTS wizard_state jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.save_festival_wizard(
  p_id uuid, p_festival jsonb, p_occurrence jsonb DEFAULT NULL,
  p_content jsonb DEFAULT NULL, p_settings jsonb DEFAULT NULL,
  p_status text DEFAULT 'Draft', p_step integer DEFAULT 1
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  fid uuid := p_id;
  f public.festivals;
  o public.festival_occurrences;
  c public.festival_content;
  s public.festival_settings;
  oid uuid;
  cid uuid;
  sid uuid;
  item jsonb;
BEGIN
  IF NOT public.is_content_admin() THEN RAISE EXCEPTION 'Editor or super administrator required' USING ERRCODE = '42501'; END IF;
  IF p_step NOT BETWEEN 1 AND 9 OR p_status NOT IN ('Draft','Published','Archived') THEN RAISE EXCEPTION 'Invalid wizard step or status'; END IF;
  IF fid IS NULL THEN
    INSERT INTO public.festivals(name, slug, status) VALUES (p_festival->>'name', p_festival->>'slug', 'Draft') RETURNING id INTO fid;
  END IF;
  SELECT * INTO STRICT f FROM public.festivals WHERE id = fid FOR UPDATE;
  -- The parent lock serializes saves, including child insert/update decisions.
  f := jsonb_populate_record(f, p_festival - ARRAY['id','status','created_by','created_at','updated_at','wizard_state']);
  IF btrim(coalesce(f.name,'')) = '' OR btrim(coalesce(f.short_description,'')) = '' OR coalesce(f.slug,'') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Name, short description and a valid unique slug are required';
  END IF;
  IF f.cover_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.festival_media WHERE id=f.cover_media_id AND festival_id=fid AND media_type IN ('image','banner','gallery')) THEN RAISE EXCEPTION 'Cover must be an image belonging to this festival'; END IF;
  UPDATE public.festivals SET name=f.name, alternate_name=f.alternate_name, slug=f.slug, festival_type=f.festival_type, primary_deity=f.primary_deity, associated_deities=f.associated_deities, tradition=f.tradition, short_description=f.short_description, is_active=f.is_active, cover_media_id=f.cover_media_id, status='Draft' WHERE id=fid;
  IF p_occurrence IS NOT NULL AND coalesce(p_occurrence->>'festival_date','') <> '' THEN
    oid := nullif(p_occurrence->>'id','')::uuid;
    IF oid IS NOT NULL THEN
      SELECT * INTO STRICT o FROM public.festival_occurrences WHERE id=oid AND festival_id=fid FOR UPDATE;
    ELSE
      SELECT * INTO o FROM public.festival_occurrences WHERE festival_id=fid AND year=(p_occurrence->>'year')::integer FOR UPDATE;
      oid := o.id;
      IF oid IS NULL THEN
        INSERT INTO public.festival_occurrences(festival_id, year, festival_date) VALUES(fid,(p_occurrence->>'year')::integer,(p_occurrence->>'festival_date')::date) RETURNING * INTO o;
        oid := o.id;
      END IF;
    END IF;
    o := jsonb_populate_record(o, p_occurrence - ARRAY['id','festival_id','status','created_by','updated_by','published_by','published_at','created_at','updated_at']);
    IF extract(year FROM o.festival_date)::integer <> o.year THEN RAISE EXCEPTION 'Year must match the festival date'; END IF;
    IF o.shubha_muhurta_end < o.shubha_muhurta_start THEN RAISE EXCEPTION 'Invalid shubha_muhurta range'; END IF;
    IF o.puja_time_end < o.puja_time_start THEN RAISE EXCEPTION 'Invalid puja_time range'; END IF;
    IF o.rahu_kalam_end < o.rahu_kalam_start THEN RAISE EXCEPTION 'Invalid rahu_kalam range'; END IF;
    IF o.yamagandam_end < o.yamagandam_start THEN RAISE EXCEPTION 'Invalid yamagandam range'; END IF;
    IF o.gulika_kalam_end < o.gulika_kalam_start THEN RAISE EXCEPTION 'Invalid gulika_kalam range'; END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(o.custom_timings) LOOP
      IF btrim(coalesce(item->>'name',''))='' OR coalesce(item->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR coalesce(item->>'end','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'Invalid custom timing'; END IF;
    END LOOP;
    IF p_status='Published' AND o.fasting_enabled AND o.parana_required AND o.parana_time IS NULL THEN RAISE EXCEPTION 'Parana time is required'; END IF;
    UPDATE public.festival_occurrences SET year=o.year, festival_date=o.festival_date, tithi_name=o.tithi_name, paksha=o.paksha, nakshatra_name=o.nakshatra_name, yoga_name=o.yoga_name, shubha_muhurta_start=o.shubha_muhurta_start, shubha_muhurta_end=o.shubha_muhurta_end, puja_time_start=o.puja_time_start, puja_time_end=o.puja_time_end, rahu_kalam_start=o.rahu_kalam_start, rahu_kalam_end=o.rahu_kalam_end, yamagandam_start=o.yamagandam_start, yamagandam_end=o.yamagandam_end, gulika_kalam_start=o.gulika_kalam_start, gulika_kalam_end=o.gulika_kalam_end, fasting_enabled=o.fasting_enabled, fasting_type=o.fasting_type, parana_required=o.parana_required, parana_time=o.parana_time, fasting_rules=o.fasting_rules, custom_timings=o.custom_timings, status=CASE p_status WHEN 'Published' THEN 'published' WHEN 'Archived' THEN 'archived' ELSE 'draft' END WHERE id=oid;
  ELSIF p_status='Published' THEN RAISE EXCEPTION 'Festival date is required to publish';
  END IF;
  IF p_content IS NOT NULL THEN
    cid := nullif(p_content->>'id','')::uuid;
    IF cid IS NOT NULL THEN
      SELECT * INTO STRICT c FROM public.festival_content WHERE id=cid AND festival_id=fid FOR UPDATE;
    ELSE
      SELECT * INTO c FROM public.festival_content WHERE festival_id=fid AND (occurrence_id=oid OR occurrence_id IS NULL) ORDER BY occurrence_id NULLS LAST, created_at LIMIT 1 FOR UPDATE;
      cid := c.id;
      IF cid IS NULL THEN INSERT INTO public.festival_content(festival_id) VALUES(fid) RETURNING * INTO c; cid := c.id; END IF;
    END IF;
    c := jsonb_populate_record(c, p_content - ARRAY['id','festival_id','occurrence_id','created_at','updated_at']);
    IF c.puja_duration_minutes IS NOT NULL AND c.puja_duration_minutes < 1 THEN RAISE EXCEPTION 'Invalid puja duration'; END IF;
    UPDATE public.festival_content SET festival_description=c.festival_description, spiritual_significance=c.spiritual_significance, festival_story=c.festival_story, scriptural_references=c.scriptural_references, puja_name=c.puja_name, puja_duration_minutes=c.puja_duration_minutes, puja_description=c.puja_description, puja_samagri=c.puja_samagri, puja_vidhi=c.puja_vidhi, story_r2_key=c.story_r2_key, story_r2_url=c.story_r2_url, puja_r2_key=c.puja_r2_key, puja_r2_url=c.puja_r2_url, related_scriptures=c.related_scriptures, related_slokas=c.related_slokas, related_mantras=c.related_mantras, related_stotrams=c.related_stotrams, related_music=c.related_music, related_stories=c.related_stories, occurrence_id=coalesce(oid,c.occurrence_id) WHERE id=cid;
  END IF;
  IF p_settings IS NOT NULL THEN
    SELECT * INTO s FROM public.festival_settings WHERE festival_id=fid FOR UPDATE;
    sid := s.id;
    IF sid IS NULL THEN INSERT INTO public.festival_settings(festival_id) VALUES(fid) RETURNING * INTO s; sid := s.id; END IF;
    s := jsonb_populate_record(s, p_settings - ARRAY['id','festival_id','occurrence_id','created_at','updated_at']);
    IF s.priority NOT BETWEEN 0 AND 100 OR s.show_until < s.show_from THEN RAISE EXCEPTION 'Invalid home page settings'; END IF;
    UPDATE public.festival_settings SET show_on_home=s.show_on_home, is_featured=s.is_featured, priority=s.priority, show_from=s.show_from, show_until=s.show_until, show_in_calendar=s.show_in_calendar WHERE id=sid;
  END IF;
  UPDATE public.festivals SET status=p_status,
    wizard_state=jsonb_build_object('step',p_step,'occurrence_draft',CASE WHEN oid IS NULL THEN p_occurrence ELSE NULL END)
    WHERE id=fid;
  RETURN fid;
END $$;
REVOKE ALL ON FUNCTION public.save_festival_wizard(uuid,jsonb,jsonb,jsonb,jsonb,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_festival_wizard(uuid,jsonb,jsonb,jsonb,jsonb,text,integer) TO authenticated;

-- Atomic cover selection; a cover cannot point into another festival.
CREATE OR REPLACE FUNCTION public.set_festival_cover(p_festival_id uuid, p_media_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF NOT public.is_content_admin() THEN RAISE EXCEPTION 'Editor required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.festivals WHERE id=p_festival_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Festival not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.festival_media WHERE id=p_media_id AND festival_id=p_festival_id AND media_type IN ('image','banner','gallery')) THEN RAISE EXCEPTION 'Invalid cover image'; END IF;
  UPDATE public.festival_media SET is_cover=(id=p_media_id) WHERE festival_id=p_festival_id AND (is_cover OR id=p_media_id);
  UPDATE public.festivals SET cover_media_id=p_media_id WHERE id=p_festival_id;
END $$;
REVOKE ALL ON FUNCTION public.set_festival_cover(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_festival_cover(uuid,uuid) TO authenticated;

-- Enforce publication requirements even for direct table updates.
CREATE OR REPLACE FUNCTION public.validate_festival_publication() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.status='Published' THEN
    IF btrim(coalesce(NEW.name,''))='' OR btrim(coalesce(NEW.short_description,''))='' OR coalesce(NEW.slug,'') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR NOT EXISTS (
      SELECT 1 FROM public.festival_occurrences WHERE festival_id=NEW.id AND status='published'
    ) THEN RAISE EXCEPTION 'Complete festival details and publish an occurrence before publishing'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS festival_publication_validation ON public.festivals;
CREATE TRIGGER festival_publication_validation BEFORE INSERT OR UPDATE ON public.festivals FOR EACH ROW EXECUTE FUNCTION public.validate_festival_publication();
COMMIT;
