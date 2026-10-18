import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3.1101.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
type Language = { translation: string; meaning: string; explanation: string; example: string };
type Sloka = { id: string; verse_number: number; sanskrit: { devanagari: string; transliteration: string }; languages: Record<string, Language> };
type CoreSloka = Omit<Sloka, 'languages'>;
type Manifest = { corePath: string; languagePaths: Record<string, string> };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const prefixFor = (slug: string) => slug.split('-').map(word => word[0]).join('').toUpperCase();
const readJson = async (r2: S3Client, bucket: string, key: string) => { const object = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key })); return JSON.parse(await new Response(object.Body!.transformToWebStream()).text()); };
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
    const { categoryId, chapterId, slokas, conflictResolution = 'skip' } = await request.json();
    if (!Array.isArray(slokas) || !slokas.length || slokas.length > 10) return reply({ error: 'Expected 1 to 10 slokas.' }, 400);
    const [{ data: category }, { data: chapter }] = await Promise.all([db.from('content_categories').select('slug').eq('id', categoryId).single(), db.from('content_chapters').select('chapter_number').eq('id', chapterId).eq('category_id', categoryId).single()]);
    if (!category || !chapter) return reply({ error: 'Category or chapter was not found.' }, 404);
    const seen = new Set<number>(); const expected = prefixFor(category.slug);
    for (const verse of slokas as Sloka[]) { const match = verse?.id?.match(/^([A-Za-z]{1,8})\.(\d+)\.(\d+)$/); const langs = Object.values(verse?.languages || {}); if (!match || match[1].toUpperCase() !== expected || Number(match[2]) !== chapter.chapter_number || Number(match[3]) !== verse.verse_number || !Number.isInteger(verse.verse_number) || seen.has(verse.verse_number) || !verse.sanskrit?.devanagari?.trim() || !verse.sanskrit?.transliteration?.trim() || !langs.length || langs.some(x => !x.translation?.trim() || !x.meaning?.trim() || !x.explanation?.trim() || !x.example?.trim())) return reply({ error: `Invalid content for ${verse?.id || 'unknown'}.` }, 400); seen.add(verse.verse_number); }
    const { data: existing } = await db.from('content_verses').select('content_id,verse_number,version,audio_status,audio_r2_path,audio_version').eq('chapter_id', chapterId).eq('is_deleted', false).in('verse_number', [...seen]);
    if (existing?.length && conflictResolution !== 'replace') return reply({ error: 'Duplicate slokas require an explicit replace decision.', duplicates: existing.map(x => x.content_id) }, 409);
    const r2 = new S3Client({ region: 'auto', endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`, credentials: { accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!, secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')! } }); const bucket = Deno.env.get('R2_BUCKET')!;
    const label = `chapter-${String(chapter.chapter_number).padStart(2, '0')}`; const manifestKey = `scriptures/${category.slug}/chapters/${label}/current.json`;
    let old: Sloka[] = []; let oldManifest: Manifest | null = null;
    try { oldManifest = await readJson(r2, bucket, manifestKey) as Manifest; const core = await readJson(r2, bucket, oldManifest.corePath); const byId = new Map<string, Sloka>((core.slokas || []).map((v: CoreSloka) => [v.id, { ...v, languages: {} }])); await Promise.all(Object.entries(oldManifest.languagePaths || {}).map(async ([lang, path]) => { const language = await readJson(r2, bucket, path); for (const value of language.slokas || []) { const verse = byId.get(value.id); if (verse) verse.languages[lang] = { translation: value.translation, meaning: value.meaning, explanation: value.explanation, example: value.example }; } })); old = [...byId.values()]; } catch (error) { if ((error as any)?.name !== 'NoSuchKey') throw error; }
    const merged = new Map(old.map(v => [v.id, v])); for (const verse of slokas as Sloka[]) merged.set(verse.id, verse); const all = [...merged.values()].sort((a, b) => a.verse_number - b.verse_number);
    const languages = [...new Set(all.flatMap(v => Object.keys(v.languages)))]; const version = crypto.randomUUID(); const root = `scriptures/${category.slug}/_versions/${label}/${version}`; const corePath = `${root}/core/${label}.json`; const languagePaths = Object.fromEntries(languages.map(lang => [lang, `${root}/languages/${lang}/${label}.json`])); const written: string[] = [];
    try { const writes = [r2.send(new PutObjectCommand({ Bucket: bucket, Key: corePath, Body: JSON.stringify({ scripture: category.slug, chapter: chapter.chapter_number, content_version: version, slokas: all.map(({ languages: _languages, ...core }) => core) }), ContentType: 'application/json' })).then(() => written.push(corePath)), ...languages.map(lang => r2.send(new PutObjectCommand({ Bucket: bucket, Key: languagePaths[lang], Body: JSON.stringify({ scripture: category.slug, chapter: chapter.chapter_number, content_version: version, slokas: all.filter(v => v.languages[lang]).map(v => ({ id: v.id, verse_number: v.verse_number, ...v.languages[lang] })) }), ContentType: 'application/json' })).then(() => written.push(languagePaths[lang])))]; await Promise.all(writes); } catch (error) { await Promise.allSettled(written.map(Key => r2.send(new DeleteObjectCommand({ Bucket: bucket, Key })))); throw error; }
    const { data: allExisting } = await db.from('content_verses').select('content_id,verse_number,version,audio_status,audio_r2_path,audio_version').eq('chapter_id', chapterId).eq('is_deleted', false);
    const incoming = new Set((slokas as Sloka[]).map(v => v.id));
    const rows = all.map(v => { const previous = allExisting?.find(x => x.content_id === v.id); const replaced = incoming.has(v.id) && !!previous; return { chapter_id: chapterId, verse_number: v.verse_number, content_id: v.id, status: 'Draft', available_languages: Object.keys(v.languages), core_r2_path: corePath, language_r2_paths: languagePaths, version: previous ? previous.version + (replaced ? 1 : 0) : 1, updated_by: user.id, audio_status: replaced ? 'stale' : previous?.audio_status || 'not_generated', audio_r2_path: previous?.audio_r2_path || null, audio_version: previous?.audio_version || null, is_deleted: false }; });
    const { error: metadataError } = await db.from('content_verses').upsert(rows, { onConflict: 'chapter_id,verse_number' }); if (metadataError) return reply({ error: 'Content staged but metadata update failed. Retry safely.' }, 500);
    await r2.send(new PutObjectCommand({ Bucket: bucket, Key: manifestKey, Body: JSON.stringify({ corePath, languagePaths, content_version: version }), ContentType: 'application/json' }));
    const { error: publishError } = await db.from('content_verses').update({ status: 'Published' }).eq('chapter_id', chapterId).in('verse_number', all.map(v => v.verse_number)); if (publishError) return reply({ error: 'Content is committed; metadata publishing state needs retry.' }, 500);
    return reply({ published: rows.length, corePath, languagePaths, languages });
  } catch (error) { console.error(error); return reply({ error: 'Failed to publish content.' }, 500); }
});
