export const festivalMediaRules: Record<string, { folder: string; limit: number }> = {
  'image/jpeg': { folder: 'images', limit: 10 * 1024 * 1024 },
  'image/png': { folder: 'images', limit: 10 * 1024 * 1024 },
  'image/webp': { folder: 'images', limit: 10 * 1024 * 1024 },
  'audio/mpeg': { folder: 'audio', limit: 25 * 1024 * 1024 },
  'audio/mp4': { folder: 'audio', limit: 25 * 1024 * 1024 },
  'audio/wav': { folder: 'audio', limit: 25 * 1024 * 1024 },
  'audio/ogg': { folder: 'audio', limit: 25 * 1024 * 1024 },
  'audio/webm': { folder: 'audio', limit: 25 * 1024 * 1024 },
  'video/mp4': { folder: 'video', limit: 100 * 1024 * 1024 },
  'video/webm': { folder: 'video', limit: 100 * 1024 * 1024 },
  'application/json': { folder: 'content', limit: 2 * 1024 * 1024 },
};
export function validateFestivalMedia(type: string, size: number, folder?: string) {
  const rule = festivalMediaRules[type];
  if (!rule || folder && rule.folder !== folder) throw new Error('Unsupported festival file type. Use JPEG, PNG, WebP, supported audio, MP4/WebM video or JSON.');
  if (!Number.isSafeInteger(size) || size <= 0 || size > rule.limit) throw new Error(`File must be nonempty and at most ${rule.limit / 1024 / 1024} MB.`);
}
export function festivalUploadIdentity(key: string): { identity: string; folder: string } {
  const match = /^festivals\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(\d{4})\/(images|audio|video|content)\/[a-zA-Z0-9_.-]+$/.exec(key);
  if (!match || key.includes('..')) throw new Error('Invalid festival media path.');
  return { identity: match[1], folder: match[3] };
}
