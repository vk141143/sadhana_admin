/**
 * sloka-audio Edge Function
 *
 * Two-phase secure upload for Sanskrit sloka WAV audio files.
 *
 * Phase 1 — sign:   Client sends { action:'sign', sloka_id, verse_id, chapter_number, verse_number, size }
 *                   Returns a pre-signed S3 PUT URL and the deterministic object key.
 *
 * Phase 2 — verify: Client sends { action:'verify', object_key }
 *                   Server fetches the first 12 bytes from R2, validates RIFF/WAVE magic,
 *                   checks size and content-type, then returns { object_key, public_url, file_size_bytes }.
 *
 * Security:
 *   - Requires authenticated editor or super_admin (write=true via requireAdmin).
 *   - Object key is always server-generated from validated verse identifiers.
 *   - Key is restricted to the sloka-audio/ prefix.
 *   - Only audio/wav content-type is accepted.
 *   - RIFF/WAVE magic bytes are verified server-side after upload.
 *   - Maximum file size: 25 MiB (WAV_LIMIT).
 *   - R2 credentials never leave the server.
 */

import {
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from 'npm:@aws-sdk/client-s3@3.1101.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.1101.0';
import { requireAdmin } from '../_shared/requireAdmin.ts';
import { AccessError } from '../_shared/adminPolicy.ts';

// Maximum WAV file size: 25 MiB (matches sadhana-media audio limit).
const WAV_LIMIT = 25 * 1024 * 1024;

// Signed URL expiry in seconds.
const SIGN_EXPIRY = 300;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function requiredEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

function r2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${requiredEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnv('R2_SECRET_ACCESS_KEY'),
    },
  });
}

/** Build the deterministic R2 key from validated verse identifiers. */
function buildObjectKey(verseId: string, chapterNumber: number, verseNumber: number): string {
  // verseId format: BG.1.1 — extract the scripture prefix (e.g. "BG")
  const prefix = verseId.split('.')[0].toUpperCase();
  return `sloka-audio/${prefix}/${chapterNumber}/${verseNumber}.wav`;
}

/** Validate that the key belongs to the sloka-audio prefix and has no path traversal. */
function isSafeKey(key: string): boolean {
  return (
    /^sloka-audio\/[A-Z]{1,8}\/\d+\/\d+\.wav$/.test(key) &&
    !key.includes('..')
  );
}

/** Check RIFF/WAVE magic bytes: bytes 0-3 = "RIFF", bytes 8-11 = "WAVE". */
function isWavSignature(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // RIFF
    bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45   // WAVE
  );
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);

  // Authenticate — requires editor or super_admin (write = true).
  try {
    await requireAdmin(request, true);
  } catch (error) {
    if (error instanceof AccessError) return reply({ error: error.message }, error.status);
    return reply({ error: 'Administrator verification is unavailable.' }, 503);
  }

  // Parse body (cap at 4 KiB to prevent abuse).
  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 4096) return reply({ error: 'Request body too large.' }, 413);
    body = JSON.parse(text);
  } catch {
    return reply({ error: 'A valid JSON request body is required.' }, 400);
  }

  if (!isRecord(body) || typeof body.action !== 'string') {
    return reply({ error: 'Missing required field: action.' }, 400);
  }

  // ── Phase 1: sign ──────────────────────────────────────────────────────────
  if (body.action === 'sign') {
    const { sloka_id, verse_id, chapter_number, verse_number, size } = body;

    if (
      typeof sloka_id !== 'string' || !/^[0-9a-f-]{36}$/.test(sloka_id) ||
      typeof verse_id !== 'string' || !/^[A-Za-z]{1,8}\.\d+\.\d+$/.test(verse_id) ||
      !Number.isInteger(chapter_number) || (chapter_number as number) < 1 ||
      !Number.isInteger(verse_number) || (verse_number as number) < 1 ||
      typeof size !== 'number' || !Number.isSafeInteger(size) || size <= 0
    ) {
      return reply({ error: 'Invalid or missing upload parameters.' }, 400);
    }

    if (size > WAV_LIMIT) {
      return reply({ error: `File exceeds the 25 MiB limit (${WAV_LIMIT} bytes).` }, 413);
    }

    const objectKey = buildObjectKey(
      verse_id as string,
      chapter_number as number,
      verse_number as number,
    );

    try {
      const client = r2Client();
      const bucket = requiredEnv('R2_BUCKET');
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: 'audio/wav',
        ContentLength: size as number,
      });
      const uploadUrl = await getSignedUrl(client, command, { expiresIn: SIGN_EXPIRY });
      return reply({ upload_url: uploadUrl, object_key: objectKey });
    } catch {
      return reply({ error: 'Secure upload URL could not be prepared.' }, 503);
    }
  }

  // ── Phase 2: verify ────────────────────────────────────────────────────────
  if (body.action === 'verify') {
    const { object_key } = body;

    if (typeof object_key !== 'string' || !isSafeKey(object_key)) {
      return reply({ error: 'Invalid or missing object_key.' }, 400);
    }

    try {
      const client = r2Client();
      const bucket = requiredEnv('R2_BUCKET');

      // HEAD to get size and content-type.
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: object_key }));
      const fileSize = head.ContentLength ?? 0;
      const contentType = (head.ContentType ?? '').toLowerCase().split(';')[0].trim();

      if (contentType !== 'audio/wav') {
        return reply({ error: 'Uploaded file is not audio/wav.' }, 422);
      }
      if (fileSize <= 0 || fileSize > WAV_LIMIT) {
        return reply({ error: 'Uploaded file size is invalid or exceeds the 25 MiB limit.' }, 422);
      }

      // GET first 12 bytes to verify RIFF/WAVE magic.
      const sample = await client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: object_key,
        Range: 'bytes=0-11',
      }));
      if (!sample.Body) return reply({ error: 'Could not read uploaded file for verification.' }, 422);
      const bytes = await sample.Body.transformToByteArray();

      if (!isWavSignature(bytes)) {
        return reply({ error: 'File does not have a valid RIFF/WAVE signature.' }, 422);
      }

      const publicBase = requiredEnv('R2_PUBLIC_URL').replace(/\/+$/, '');
      return reply({
        object_key,
        public_url: `${publicBase}/${object_key}`,
        file_size_bytes: fileSize,
      });
    } catch (error) {
      // Distinguish 404 (not found) from other R2 errors.
      const status =
        error instanceof Error && 'name' in error && error.name === 'NotFound' ? 404 : 503;
      return reply(
        { error: status === 404 ? 'Uploaded file was not found in storage.' : 'File verification failed.' },
        status,
      );
    }
  }

  return reply({ error: 'Unsupported action.' }, 400);
});
