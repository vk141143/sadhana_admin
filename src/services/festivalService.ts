/**
 * Festival Service — Supabase operations for the normalized Festival CMS.
 * Schema: festivals → festival_occurrences → festival_content + festival_media
 * Large files (images, audio, video, JSON) live in Cloudflare R2.
 *
 * Status conventions (do not mix):
 *   festivals.status          → 'Draft' | 'Published' | 'Archived'  (Title Case)
 *   festival_occurrences.status → 'draft' | 'review' | 'published' | 'archived' (lowercase)
 */

import { supabase } from './supabaseClient';
import {
  Festival,
  FestivalFull,
  FestivalOccurrence,
  FestivalContent,
  FestivalMedia,
  FestivalSettings,
} from '../types';

// ── List ──────────────────────────────────────────────────────────────────────

export interface FestivalListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  festival_type?: string;
  featured?: boolean;
}

export interface FestivalListItem {
  id: string;
  name: string;
  alternate_name: string;
  slug: string;
  festival_type: string;
  festival_date: string | null;
  status: string;
  short_description: string;
  primary_deity: string;
  cover_url: string;
  is_featured: boolean;
  show_on_home: boolean;
  regions: string[];
  created_at: string;
  updated_at: string;
}

export const fetchFestivalList = async (params: FestivalListParams = {}) => {
  const { page = 1, limit = 20, search, status, festival_type, featured } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // After migration 014, festival_date is removed from festivals.
  // We join the most recent occurrence to get the date for display.
  let query = supabase
    .from('festivals')
    .select(
      `id, name, alternate_name, slug, festival_type, status,
       short_description, primary_deity, cover_media_id, is_active, created_at, updated_at,
       festival_settings(is_featured, show_on_home),
       festival_media!cover_media_id(public_url),
       festival_occurrences(festival_date, year, status)`,
      { count: 'exact' }
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search)        query = query.ilike('name', `%${search}%`);
  if (status)        query = query.eq('status', status);
  if (festival_type) query = query.eq('festival_type', festival_type);

  const { data, error, count } = await query;
  if (error) throw error;

  const items: FestivalListItem[] = (data || []).map((row: any) => {
    const settings = Array.isArray(row.festival_settings)
      ? row.festival_settings[0] ?? {}
      : row.festival_settings ?? {};

    // Get cover URL from joined festival_media
    const coverMedia = Array.isArray(row.festival_media)
      ? row.festival_media[0]
      : row.festival_media;

    // Get most recent occurrence date
    const occurrences: any[] = Array.isArray(row.festival_occurrences)
      ? row.festival_occurrences
      : row.festival_occurrences ? [row.festival_occurrences] : [];
    const latestOcc = occurrences.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))[0];

    return {
      id: row.id,
      name: row.name,
      alternate_name: row.alternate_name || '',
      slug: row.slug || '',
      festival_type: row.festival_type,
      festival_date: latestOcc?.festival_date ?? null,
      status: row.status,
      short_description: row.short_description || '',
      primary_deity: row.primary_deity || '',
      cover_url: coverMedia?.public_url || '',
      is_featured: settings.is_featured ?? false,
      show_on_home: settings.show_on_home ?? false,
      regions: [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });

  const filtered = featured !== undefined ? items.filter(i => i.is_featured === featured) : items;
  return { data: filtered, count: count ?? 0 };
};

// ── Fetch full festival ───────────────────────────────────────────────────────

export const fetchFestivalFull = async (id: string): Promise<FestivalFull> => {
  const [festResult, occResult, contentResult, mediaResult, settingsResult] =
    await Promise.all([
      supabase.from('festivals').select('*').eq('id', id).single(),
      supabase.from('festival_occurrences').select('*').eq('festival_id', id).order('year', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('festival_content').select('*').eq('festival_id', id).maybeSingle(),
      supabase.from('festival_media').select('*').eq('festival_id', id).order('sort_order'),
      supabase.from('festival_settings').select('*').eq('festival_id', id).maybeSingle(),
    ]);

  if (festResult.error) throw festResult.error;

  const fest = festResult.data as Festival;
  // Derive banner_url from cover media for backward compat with wizard state
  const mediaList = (mediaResult.data as FestivalMedia[]) || [];
  const coverMedia = mediaList.find(m => m.is_cover) ?? mediaList[0];

  return {
    ...fest,
    banner_url: coverMedia?.public_url ?? '',
    occurrence: (occResult.data as FestivalOccurrence | null) ?? null,
    content: (contentResult.data as FestivalContent | null) ?? null,
    media: mediaList,
    settings: (settingsResult.data as FestivalSettings | null) ?? null,
  };
};

// ── Create festival ───────────────────────────────────────────────────────────

export const createFestival = async (payload: Partial<Festival>): Promise<string> => {
  const slug = payload.slug?.trim() ||
    (payload.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const { data, error } = await supabase
    .from('festivals')
    .insert({
      name: payload.name || '',
      alternate_name: payload.alternate_name || '',
      slug,
      festival_type: payload.festival_type || 'Major Festival',
      primary_deity: payload.primary_deity || '',
      associated_deities: payload.associated_deities ?? [],
      tradition: payload.tradition || 'general',
      short_description: payload.short_description || '',
      is_active: true,
      status: 'Draft',
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
};

// ── Update festival core ──────────────────────────────────────────────────────

export const updateFestival = async (id: string, payload: Partial<Festival>): Promise<void> => {
  // Strip any legacy columns that no longer exist in the DB after migration 014
  const {
    banner_url, banner_storage_key,
    story_url, story_storage_key,
    puja_url, puja_storage_key,
    story_audio_url, story_audio_key,
    story_video_url, story_video_key,
    tithi, paksha, tithi_start, tithi_end,
    nakshatra, nakshatra_start, nakshatra_end,
    yoga, karana, festival_date, description,
    ...safe
  } = payload as any;

  const { error } = await supabase
    .from('festivals')
    .update({ ...safe, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};

// ── Occurrence CRUD ───────────────────────────────────────────────────────────

export const upsertOccurrence = async (
  festivalId: string,
  payload: Partial<FestivalOccurrence>,
): Promise<FestivalOccurrence> => {
  const year = payload.year || new Date().getFullYear();

  const { data: existing } = await supabase
    .from('festival_occurrences')
    .select('id')
    .eq('festival_id', festivalId)
    .eq('year', year)
    .maybeSingle();

  const body = {
    ...payload,
    festival_id: festivalId,
    year,
    festival_date: payload.festival_date || new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('festival_occurrences')
      .update(body)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as FestivalOccurrence;
  } else {
    const { data, error } = await supabase
      .from('festival_occurrences')
      .insert({ ...body, created_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data as FestivalOccurrence;
  }
};

export const fetchOccurrences = async (festivalId: string): Promise<FestivalOccurrence[]> => {
  const { data, error } = await supabase
    .from('festival_occurrences')
    .select('*')
    .eq('festival_id', festivalId)
    .order('year', { ascending: false });
  if (error) throw error;
  return (data || []) as FestivalOccurrence[];
};

// ── Content CRUD ──────────────────────────────────────────────────────────────

export const upsertContent = async (
  festivalId: string,
  payload: Partial<FestivalContent>,
  occurrenceId?: string | null,
): Promise<FestivalContent> => {
  const { data: existing } = await supabase
    .from('festival_content')
    .select('id')
    .eq('festival_id', festivalId)
    .maybeSingle();

  const body = {
    ...payload,
    festival_id: festivalId,
    occurrence_id: occurrenceId ?? null,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('festival_content')
      .update(body)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as FestivalContent;
  } else {
    const { data, error } = await supabase
      .from('festival_content')
      .insert({ ...body, created_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data as FestivalContent;
  }
};

// ── Media CRUD ────────────────────────────────────────────────────────────────

export const insertFestivalMedia = async (
  festivalId: string,
  media: Omit<FestivalMedia, 'id' | 'festival_id' | 'created_at' | 'updated_at'>,
): Promise<FestivalMedia> => {
  const { data, error } = await supabase
    .from('festival_media')
    .insert({
      festival_id: festivalId,
      occurrence_id: media.occurrence_id ?? null,
      media_type: media.media_type,
      title: media.title || '',
      description: media.description || '',
      file_name: media.file_name || '',
      r2_key: media.r2_key || media.storage_key || '',
      storage_key: media.storage_key || media.r2_key || '',
      public_url: media.public_url,
      mime_type: media.mime_type || '',
      file_size: media.file_size || 0,
      duration_seconds: media.duration_seconds ?? null,
      language_code: media.language_code || '',
      alt_text: media.alt_text || '',
      caption: media.caption || '',
      sort_order: media.sort_order ?? media.display_order ?? 0,
      display_order: media.display_order ?? media.sort_order ?? 0,
      is_cover: media.is_cover ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as FestivalMedia;
};

export const updateFestivalMedia = async (
  mediaId: string,
  updates: Partial<FestivalMedia>,
): Promise<void> => {
  const { error } = await supabase
    .from('festival_media')
    .update(updates)
    .eq('id', mediaId);
  if (error) throw error;
};

export const deleteFestivalMedia = async (mediaId: string): Promise<void> => {
  const { error } = await supabase.from('festival_media').delete().eq('id', mediaId);
  if (error) throw error;
};

export const setCoverMedia = async (festivalId: string, mediaId: string): Promise<void> => {
  await supabase.from('festival_media').update({ is_cover: false }).eq('festival_id', festivalId);
  await supabase.from('festival_media').update({ is_cover: true }).eq('id', mediaId);
  await supabase.from('festivals')
    .update({ cover_media_id: mediaId, updated_at: new Date().toISOString() })
    .eq('id', festivalId);
};

// ── Settings ──────────────────────────────────────────────────────────────────

export const upsertFestivalSettings = async (
  festivalId: string,
  settings: Omit<FestivalSettings, 'id' | 'festival_id' | 'created_at' | 'updated_at'>,
): Promise<void> => {
  const { data: existing } = await supabase
    .from('festival_settings')
    .select('id')
    .eq('festival_id', festivalId)
    .maybeSingle();

  const payload = { ...settings, festival_id: festivalId, updated_at: new Date().toISOString() };

  if (existing?.id) {
    const { error } = await supabase.from('festival_settings').update(payload).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('festival_settings').insert(payload);
    if (error) throw error;
  }
};

// ── Delete ────────────────────────────────────────────────────────────────────

export const deleteFestival = async (id: string): Promise<void> => {
  const { error } = await supabase.from('festivals').delete().eq('id', id);
  if (error) throw error;
};

// ── Duplicate ─────────────────────────────────────────────────────────────────

export const duplicateFestival = async (sourceId: string): Promise<string> => {
  const source = await fetchFestivalFull(sourceId);
  const newId = await createFestival({
    name: `${source.name} (Copy)`,
    alternate_name: source.alternate_name,
    slug: `${source.slug}-copy-${Date.now()}`,
    festival_type: source.festival_type,
    primary_deity: source.primary_deity,
    tradition: source.tradition,
    short_description: source.short_description,
    status: 'Draft',
  });

  if (source.settings) {
    await upsertFestivalSettings(newId, {
      show_on_home: false,
      is_featured: false,
      priority: source.settings.priority,
      show_from: null,
      show_until: null,
      show_in_calendar: source.settings.show_in_calendar,
    });
  }

  return newId;
};

// ── Publish / Unpublish ───────────────────────────────────────────────────────

export const publishFestival = async (id: string): Promise<void> =>
  updateFestival(id, { status: 'Published' } as any);

export const unpublishFestival = async (id: string): Promise<void> =>
  updateFestival(id, { status: 'Draft' } as any);
