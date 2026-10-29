import { supabase } from './supabaseClient';
import type { SadhanaPracticeMediaKind } from '../types/sadhanaPractice';

const MAX_SIZE: Record<SadhanaPracticeMediaKind, number> = {
  image: 10 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
};
const allowedTypes: Record<SadhanaPracticeMediaKind, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  audio: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm'],
};

interface SignedUpload {
  upload_url: string;
  object_key: string;
  media_type: SadhanaPracticeMediaKind;
  content_type: string;
}

interface CompletedUpload {
  object_key: string;
  media_url: string;
  media_type: SadhanaPracticeMediaKind;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMediaKind(value: unknown): value is SadhanaPracticeMediaKind {
  return value === 'image' || value === 'audio';
}

function isSignedUpload(value: Record<string, unknown>): value is Record<string, unknown> & SignedUpload {
  return typeof value.upload_url === 'string' &&
    typeof value.object_key === 'string' &&
    isMediaKind(value.media_type) &&
    typeof value.content_type === 'string';
}

function isCompletedUpload(value: Record<string, unknown>): value is Record<string, unknown> & CompletedUpload {
  return typeof value.object_key === 'string' &&
    typeof value.media_url === 'string' &&
    isMediaKind(value.media_type);
}

async function invokeMedia(body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke<unknown>('sadhana-media', { body });
  if (error) {
    if (isRecord(error) && error.context instanceof Response) {
      let response: unknown;
      try {
        response = await error.context.clone().json();
      } catch {
        throw new Error('Secure media service returned an unreadable error response.');
      }
      if (isRecord(response) && typeof response.error === 'string') throw new Error(response.error);
    }
    throw new Error('Secure media service could not be reached. Check your administrator session and retry.');
  }
  if (data === null || data === undefined) throw new Error('Secure media service returned an empty response.');
  return data;
}

function parseSignedUpload(value: unknown): SignedUpload {
  if (!isRecord(value) || !isSignedUpload(value)) {
    throw new Error('Secure media service returned an invalid upload authorization.');
  }
  let uploadUrl: URL;
  try {
    uploadUrl = new URL(value.upload_url);
  } catch {
    throw new Error('Secure media service returned an invalid upload URL.');
  }
  if (uploadUrl.protocol !== 'https:') throw new Error('Secure media service returned an unsafe upload URL.');
  return value;
}

function parseCompletedUpload(value: unknown): CompletedUpload {
  if (!isRecord(value) || !isCompletedUpload(value)) {
    throw new Error('Secure media service returned an invalid uploaded media record.');
  }
  let mediaUrl: URL;
  try {
    mediaUrl = new URL(value.media_url);
  } catch {
    throw new Error('Secure media service returned an invalid media URL.');
  }
  if (mediaUrl.protocol !== 'https:') throw new Error('Secure media service returned an unsafe media URL.');
  return value;
}

function putFile(
  upload: SignedUpload,
  file: File,
  onProgress: (percentage: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', upload.upload_url);
    request.setRequestHeader('Content-Type', upload.content_type);
    request.setRequestHeader('If-None-Match', '*');
    request.timeout = 120_000;
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.min(99, Math.floor((event.loaded / event.total) * 100)));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
      } else if (request.status === 412 || request.status === 409) {
        reject(new Error('This upload authorization has already been used. Select the file again to create a new upload.'));
      } else {
        reject(new Error(`Cloudflare R2 upload failed (HTTP ${request.status}). Check the bucket CORS configuration and retry.`));
      }
    };
    request.onerror = () => reject(new Error('Network error while uploading media to Cloudflare R2.'));
    request.ontimeout = () => reject(new Error('Media upload timed out. Check your connection and retry.'));
    request.onabort = () => reject(new Error('Media upload was interrupted.'));
    request.send(file);
  });
}

export const sadhanaMediaService = {
  async upload(
    file: File,
    mediaType: SadhanaPracticeMediaKind,
    onProgress: (percentage: number) => void,
  ): Promise<CompletedUpload> {
    if (!allowedTypes[mediaType].includes(file.type.toLowerCase())) {
      throw new Error(`Choose a supported ${mediaType} file (${allowedTypes[mediaType].join(', ')}).`);
    }
    if (file.size <= 0 || file.size > MAX_SIZE[mediaType]) {
      throw new Error(`File size must be between 1 byte and ${mediaType === 'image' ? '10 MB' : '25 MB'}.`);
    }

    const signedValue = await invokeMedia({
      action: 'sign',
      media_type: mediaType,
      content_type: file.type,
      size: file.size,
    });
    const signed = parseSignedUpload(signedValue);
    await putFile(signed, file, onProgress);

    const completed = parseCompletedUpload(await invokeMedia({
      action: 'complete',
      object_key: signed.object_key,
    }));
    return completed;
  },
};
