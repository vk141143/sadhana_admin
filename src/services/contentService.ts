import { supabase } from './supabaseClient';
import { Scripture, Chapter, SlokaRecord, SlokaJson } from '../types';
import { deleteFromR2 } from './r2Client';

const err = (e: any) => { throw new Error(e?.message || JSON.stringify(e)); };

// ── R2 upload helper for sloka JSON ──────────────────────────
const uploadSlokaJson = async (json: SlokaJson, verseId: string): Promise<string> => {
  const key = `slokas/${verseId.replace(/\./g, '/')}.json`;
  const file = new File([JSON.stringify(json, null, 2)], `${verseId}.json`, { type: 'application/json' });
  const { data, error } = await supabase.functions.invoke('r2-upload', {
    body: file,
    headers: { 'x-r2-key': key, 'x-file-name': file.name, 'content-type': 'application/json' },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('R2 upload did not return a URL.');
  return data.url as string;
};

// ── Fetch sloka JSON from R2 URL ─────────────────────────────
export const fetchSlokaJson = async (url: string): Promise<SlokaJson> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch sloka JSON: ${res.status}`);
  return res.json();
};

export const scriptureService = {
  async list(): Promise<Scripture[]> {
    const { data, error } = await supabase.from('scriptures').select('*').order('name');
    if (error) err(error);
    return (data || []) as Scripture[];
  },
  async save(payload: Partial<Scripture>): Promise<Scripture> {
    const body = { ...payload, updated_at: new Date().toISOString() };
    const q = payload.id
      ? supabase.from('scriptures').update(body).eq('id', payload.id).select().single()
      : supabase.from('scriptures').insert({ ...body, created_at: new Date().toISOString() }).select().single();
    const { data, error } = await q;
    if (error) err(error);
    return data as Scripture;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('scriptures').delete().eq('id', id);
    if (error) err(error);
  },
};

export const chapterService = {
  async list(scriptureId: string): Promise<Chapter[]> {
    const { data, error } = await supabase.from('chapters').select('*').eq('scripture_id', scriptureId).order('chapter_number');
    if (error) err(error);
    return (data || []) as Chapter[];
  },
  async save(payload: Partial<Chapter>): Promise<Chapter> {
    const body = { ...payload, updated_at: new Date().toISOString() };
    const q = payload.id
      ? supabase.from('chapters').update(body).eq('id', payload.id).select().single()
      : supabase.from('chapters').insert({ ...body, created_at: new Date().toISOString() }).select().single();
    const { data, error } = await q;
    if (error) err(error);
    return data as Chapter;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('chapters').delete().eq('id', id);
    if (error) err(error);
  },
  async updateSlokaCount(chapterId: string): Promise<void> {
    const { count } = await supabase.from('slokas').select('*', { count: 'exact', head: true }).eq('chapter_id', chapterId);
    await supabase.from('chapters').update({ sloka_count: count || 0, updated_at: new Date().toISOString() }).eq('id', chapterId);
  },
};

export const slokaService = {
  async list(chapterId: string): Promise<SlokaRecord[]> {
    const { data, error } = await supabase.from('slokas').select('*').eq('chapter_id', chapterId).order('verse_number');
    if (error) err(error);
    return (data || []) as SlokaRecord[];
  },
  async add(chapterId: string, json: SlokaJson): Promise<SlokaRecord> {
    const { data: existingRows, error: lookupError } = await supabase
      .from('slokas')
      .select('*')
      .eq('chapter_id', chapterId);
    if (lookupError) err(lookupError);

    const existing = (existingRows || []).find(
      (row) => row.verse_id === json.id || row.verse_number === json.verse_number
    ) as SlokaRecord | undefined;
    if (existing) return this.update(existing, json);

    const jsonUrl = await uploadSlokaJson(json, json.id);
    const body = {
      chapter_id: chapterId,
      verse_number: json.verse_number,
      verse_id: json.id,
      json_url: jsonUrl,
      status: 'Published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('slokas').insert(body).select().single();
    if (error) err(error);
    await chapterService.updateSlokaCount(chapterId);
    return data as SlokaRecord;
  },
  async update(record: SlokaRecord, json: SlokaJson): Promise<SlokaRecord> {
    if (record.verse_id !== json.id || record.verse_number !== json.verse_number) {
      throw new Error('The sloka ID and verse number cannot be changed while editing an existing sloka.');
    }

    const jsonUrl = await uploadSlokaJson(json, json.id);
    const body = { json_url: jsonUrl, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('slokas').update(body).eq('id', record.id).select().single();
    if (error) err(error);
    await chapterService.updateSlokaCount(record.chapter_id);
    return data as SlokaRecord;
  },
  async delete(record: SlokaRecord): Promise<void> {
    // Delete JSON from R2
    const key = `slokas/${record.verse_id.replace(/\./g, '/')}.json`;
    await deleteFromR2(key);
    const { error } = await supabase.from('slokas').delete().eq('id', record.id);
    if (error) err(error);
    await chapterService.updateSlokaCount(record.chapter_id);
  },
};
