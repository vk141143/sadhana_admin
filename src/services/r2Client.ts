import { validateFestivalMedia } from './festivalMediaValidation';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient';

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

// Same authenticated r2-upload endpoint, using XHR for byte-level progress.
async function uploadFestivalFile(file: File, key: string, onProgress: (value: number) => void): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Sign in as an administrator to upload media.');
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${supabaseUrl}/functions/v1/r2-upload`);
    request.setRequestHeader('Authorization', `Bearer ${data.session.access_token}`);
    request.setRequestHeader('apikey', supabaseAnonKey);
    request.setRequestHeader('x-r2-key', key);
    request.setRequestHeader('Content-Type', file.type);
    request.timeout = 180000;
    request.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.min(99, Math.round(event.loaded / event.total * 100))); };
    request.onerror = () => reject(new Error('Media upload failed. Check your connection and retry.'));
    request.ontimeout = () => reject(new Error('Media upload timed out.'));
    request.onabort = () => reject(new Error('Media upload was interrupted.'));
    request.onload = () => {
      try {
        const result = JSON.parse(request.responseText);
        if (request.status < 200 || request.status >= 300) throw new Error(result.error || 'Secure upload failed.');
        if (typeof result.url !== 'string' || !result.url.startsWith('https://')) throw new Error('Upload returned an invalid URL.');
        onProgress(100); resolve(result.url);
      } catch (error) { reject(error); }
    };
    onProgress(0); request.send(file);
  });
}

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

// Successful uploads survive metadata failures and step navigation in this tab.
// Re-selecting the same bytes retries Supabase without creating another R2 object.
const festivalUploads = new Map<string, { key: string; url: string }>();
async function reusableFestivalUpload(file: File, identity: string, folder: string, year: number, onProgress: (value: number) => void) {
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())))
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
  const cacheKey = `${identity}/${year}/${folder}/${file.type}/${digest}`;
  const previous = festivalUploads.get(cacheKey);
  if (previous) { onProgress(100); return previous; }
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const key = `festivals/${identity}/${year}/${folder}/${crypto.randomUUID()}.${ext}`;
  const result = { key, url: await uploadFestivalFile(file, key, onProgress) };
  festivalUploads.set(cacheKey, result);
  return result;
}

export const uploadFestivalMediaToR2 = async (
  file: File,
  festivalSlugOrId: string,
  mediaType: string,
  year?: number,
  onProgress: (value: number) => void = () => {},
): Promise<{ key: string; url: string }> => {
  const subfolder = festivalSubfolder(mediaType);
  validateFestivalMedia(file.type, file.size, subfolder);
  const yr = year ?? new Date().getFullYear();
  return reusableFestivalUpload(file, festivalSlugOrId, subfolder, yr, onProgress);
};

export const uploadFestivalJsonToR2 = async (
  json: object,
  festivalSlugOrId: string,
  contentType: 'story' | 'puja',
  year?: number,
  onProgress: (value: number) => void = () => {},
): Promise<{ key: string; url: string }> => {
  const yr = year ?? new Date().getFullYear();
  const fileName = contentType === 'story' ? 'story.json' : 'puja-vidhi.json';
  const file = new File([JSON.stringify(json, null, 2)], fileName, { type: 'application/json' });
  validateFestivalMedia(file.type, file.size, 'content');
  return reusableFestivalUpload(file, festivalSlugOrId, 'content', yr, onProgress);
};

export const deleteFromR2 = async (key: string): Promise<void> => {
  const { error } = await supabase.functions.invoke('r2-upload', {
    method: 'DELETE',
    body: { key },
  });
  if (error) throw error;
};
