import { supabase } from './supabaseClient';
import { slokaService } from './contentService';
import { deleteFromR2 } from './r2Client';
import type { SlokaRecord } from '../types';

export interface AudioUploadResult {
  objectKey: string;
  publicUrl: string;
  fileSizeBytes: number;
}

/** Phase 1: request a pre-signed PUT URL from the sloka-audio edge function. */
export async function signSlokaAudioUpload(
  slokaId: string,
  verseId: string,
  chapterNumber: number,
  verseNumber: number,
  fileSize: number,
): Promise<{ uploadUrl: string; objectKey: string }> {
  const { data, error } = await supabase.functions.invoke('sloka-audio', {
    body: { action: 'sign', sloka_id: slokaId, verse_id: verseId, chapter_number: chapterNumber, verse_number: verseNumber, size: fileSize },
  });
  if (error) throw error;
  if (!data?.upload_url || !data?.object_key) throw new Error('Sign response missing upload_url or object_key.');
  return { uploadUrl: data.upload_url as string, objectKey: data.object_key as string };
}

/** Phase 2: verify the uploaded object server-side. */
export async function verifySlokaAudioUpload(objectKey: string): Promise<AudioUploadResult> {
  const { data, error } = await supabase.functions.invoke('sloka-audio', {
    body: { action: 'verify', object_key: objectKey },
  });
  if (error) throw error;
  if (!data?.object_key || !data?.public_url || typeof data?.file_size_bytes !== 'number') {
    throw new Error('Verify response is incomplete.');
  }
  return { objectKey: data.object_key as string, publicUrl: data.public_url as string, fileSizeBytes: data.file_size_bytes as number };
}

/** Read WAV duration from browser audio metadata. Returns null if unavailable. */
export function readAudioDuration(file: File): Promise<number | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    const cleanup = () => URL.revokeObjectURL(url);
    audio.addEventListener('loadedmetadata', () => {
      cleanup();
      const d = audio.duration;
      resolve(Number.isFinite(d) && d >= 0 ? d : null);
    });
    audio.addEventListener('error', () => { cleanup(); resolve(null); });
  });
}

/**
 * Full upload flow:
 * 1. Read duration from browser.
 * 2. Sign → PUT to R2 → Verify.
 * 3. Save metadata to slokas row.
 * Returns the updated SlokaRecord.
 */
export async function uploadSlokaAudio(
  record: SlokaRecord,
  file: File,
  onProgress?: (phase: 'signing' | 'uploading' | 'verifying' | 'saving') => void,
): Promise<SlokaRecord> {
  const duration = await readAudioDuration(file);

  // Parse verse identifiers from verse_id (e.g. "BG.1.1")
  const parts = record.verse_id.split('.');
  if (parts.length !== 3) throw new Error(`Cannot parse verse_id: ${record.verse_id}`);
  const chapterNumber = parseInt(parts[1], 10);
  const verseNumber = parseInt(parts[2], 10);

  onProgress?.('signing');
  const { uploadUrl, objectKey } = await signSlokaAudioUpload(
    record.id, record.verse_id, chapterNumber, verseNumber, file.size,
  );

  onProgress?.('uploading');
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'audio/wav' },
    body: file,
  });
  if (!putRes.ok) throw new Error(`R2 PUT failed: ${putRes.status} ${putRes.statusText}`);

  onProgress?.('verifying');
  const verified = await verifySlokaAudioUpload(objectKey);

  onProgress?.('saving');
  return slokaService.updateAudio(
    record.id,
    verified.objectKey,
    'ready',
    duration,
    verified.fileSizeBytes,
  );
}

/**
 * Remove audio: clear DB metadata first, then delete from R2.
 * If R2 deletion fails, reports the error but does not re-set DB metadata
 * (the DB reference is already cleared — the orphaned object is non-critical).
 */
export async function removeSlokaAudio(record: SlokaRecord): Promise<{ updated: SlokaRecord; r2Error?: string }> {
  const previousKey = record.audio_r2_path;
  const updated = await slokaService.updateAudio(record.id, null, 'not_uploaded', null, null);
  let r2Error: string | undefined;
  if (previousKey) {
    try { await deleteFromR2(previousKey); }
    catch (e: any) { r2Error = e?.message || 'R2 deletion failed.'; }
  }
  return { updated, r2Error };
}
