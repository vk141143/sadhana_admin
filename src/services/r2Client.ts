import { supabase } from './supabaseClient';

// Browser uploads are proxied through the authenticated r2-upload Edge Function.
// R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are
// Deno env vars in the edge function — never exposed to the browser or Vite.

const upload = async (file: File, key: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('r2-upload', {
    body: file,
    headers: {
      'x-r2-key': key,
      'x-file-name': file.name,
      'content-type': file.type || 'application/octet-stream',
    },
  });
  if (error) throw error;
  if (!data?.url || !/^https?:\/\//i.test(data.url))
    throw new Error('R2 upload did not return a public URL. Check the R2_PUBLIC_URL configuration.');
  return data.url;
};

// ── Non-festival uploads (unchanged) ─────────────────────────────────────────

export const uploadToR2 = (file: File, subfolder: string) =>
  upload(file, `images/banners/${subfolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop() || 'jpg'}`);

export const uploadImageToR2 = (file: File, folder: string) =>
  upload(file, `images/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop() || 'jpg'}`);

export const uploadScriptureImageToR2 = (file: File, folder: string) => {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
  return upload(file, `images/scriptures/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
};

export const uploadChapterImageToR2 = (file: File, scriptureId: string) => {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
  return upload(file, `images/chapters/${scriptureId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
};

export const uploadAudioToR2 = (file: File) =>
  upload(file, `audio/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop() || 'mp3'}`);

// ── Festival uploads — slug/year path structure ───────────────────────────────
// Path: festivals/{festival-slug}/{year}/{subfolder}/{timestamp}-{random}.{ext}
// Example: festivals/krishna-janmashtami/2027/images/cover.webp

const festivalSubfolder = (mediaType: string): string => {
  if (mediaType === 'audio') return 'audio';
  if (mediaType === 'video') return 'video';
  if (mediaType === 'story_json' || mediaType === 'puja_json') return 'content';
  return 'images'; // image, banner, gallery, cover → images/
};

export const uploadFestivalMediaToR2 = async (
  file: File,
  festivalSlugOrId: string,
  mediaType: string,
  year?: number,
): Promise<{ key: string; url: string }> => {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const subfolder = festivalSubfolder(mediaType);
  const yr = year ?? new Date().getFullYear();
  const key = `festivals/${festivalSlugOrId}/${yr}/${subfolder}/${ts}.${ext}`;
  return { key, url: await upload(file, key) };
};

export const uploadFestivalJsonToR2 = async (
  json: object,
  festivalSlugOrId: string,
  contentType: 'story' | 'puja',
  year?: number,
): Promise<{ key: string; url: string }> => {
  const yr = year ?? new Date().getFullYear();
  const fileName = contentType === 'story' ? 'story.json' : 'puja-vidhi.json';
  const key = `festivals/${festivalSlugOrId}/${yr}/content/${fileName}`;
  const file = new File([JSON.stringify(json, null, 2)], fileName, { type: 'application/json' });
  return { key, url: await upload(file, key) };
};

export const deleteFromR2 = async (key: string): Promise<void> => {
  const { error } = await supabase.functions.invoke('r2-upload', {
    method: 'DELETE',
    body: { key },
  });
  if (error) throw error;
};
