import { S3Client, DeleteObjectCommand, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3.1101.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-r2-key, x-file-name', 'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const safeKey = (key: string) => /^[a-zA-Z0-9][a-zA-Z0-9/_.-]+$/.test(key) && !key.includes('..');
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const auth = request.headers.get('Authorization') || '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return reply({ error: 'Unauthorized.' }, 401);
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: admin } = await db.from('admin_users').select('role,is_active').eq('email', user.email!.toLowerCase()).maybeSingle();
    if (!admin?.is_active || !['super_admin', 'editor'].includes(admin.role)) return reply({ error: 'Forbidden.' }, 403);
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
  } catch (error) { console.error(error); return reply({ error: 'Secure R2 upload failed.' }, 500); }
});
