import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = 'ca14c8733d4cbc08a336667ca2cbad99';
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID || 'f87638d20bd6384854c07e885303b7ec';
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '33ab48eaf378cd0cf667fdac61038888b5c46e3c0c6c5b046cee3d752b866700';
const R2_BUCKET = 'sanatana-content';
// Public URL base — set this after enabling public access on the bucket in Cloudflare dashboard
const R2_PUBLIC_BASE = import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-5ac331aed8ed455b8efc7bde5ffd54bf.r2.dev';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a file to Cloudflare R2 and return its public URL.
 * All emotion images go under: sanatana-content/images/banners/<subfolder>/
 *
 * @param file     - The File object to upload
 * @param subfolder - e.g. 'cards', 'banners', 'outside', 'gita', 'means', 'examples', 'mantras'
 * @returns public URL string
 */
export const uploadToR2 = async (file: File, subfolder: string): Promise<string> => {
  const ext = file.name.split('.').pop() || 'jpg';
  const key = `images/banners/${subfolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type || 'image/jpeg',
    })
  );

  return `${R2_PUBLIC_BASE}/${key}`;
};
