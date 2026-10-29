import { S3Client, DeleteObjectCommand, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3.1101.0';
import { requireAdmin } from '../_shared/requireAdmin.ts';
import { AccessError } from '../_shared/adminPolicy.ts';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-r2-key, x-file-name', 'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const safeKey = (key: string) => /^[a-zA-Z0-9][a-zA-Z0-9/_.-]+$/.test(key) && !key.includes('..');
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!['POST', 'DELETE'].includes(request.method)) return reply({ error: 'Method not allowed.' }, 405);
  try {
    const { db, user } = await requireAdmin(request, true);
    const r2 = new S3Client({ region: 'auto', endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`, credentials: { accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!, secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')! } });
    const bucket = Deno.env.get('R2_BUCKET')!;
    if (request.method === 'DELETE') { const { key } = await request.json(); if (!safeKey(key)) return reply({ error: 'Invalid key.' }, 400); await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); return reply({ ok: true }); }
    const key = request.headers.get('x-r2-key') || '';
    if (!safeKey(key)) return reply({ error: 'Invalid key.' }, 400);
    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    await r2.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: new Uint8Array(await request.arrayBuffer()),
      ContentType: contentType,
      ...(contentType === 'application/json' ? { CacheControl: 'public, max-age=0, must-revalidate' } : {}),
    }));
    const base = Deno.env.get('R2_PUBLIC_URL');
    if (!base) return reply({ error: 'R2_PUBLIC_URL is not configured; uploaded files cannot be displayed publicly.' }, 500);
    return reply({ key, url: `${base.replace(/\/$/, '')}/${key}` });
  } catch (error) { if (error instanceof AccessError) return reply({ error: error.message }, error.status); return reply({ error: 'Secure R2 upload failed.' }, 500); }
});
