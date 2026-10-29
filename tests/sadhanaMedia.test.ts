import test from 'node:test';
import assert from 'node:assert/strict';
import { AccessError } from '../supabase/functions/_shared/adminPolicy.ts';
import {
  createSadhanaMediaHandler,
  type PracticeMediaObject,
} from '../supabase/functions/_shared/sadhanaMedia.ts';

const generatedId = '54dc88a1-41f7-4f25-b5d9-0bfdbca0a201';

function body(response: Response): Promise<Record<string, unknown>> {
  return response.json() as Promise<Record<string, unknown>>;
}

function makeHarness(options: {
  authorized?: boolean;
  signerFailure?: boolean;
  storedObject?: PracticeMediaObject | null;
  inspectFailure?: boolean;
} = {}) {
  const signed: Array<{ objectKey: string; contentType: string; contentLength: number }> = [];
  const handler = createSadhanaMediaHandler({
    async authorize(request) {
      if (!request.headers.get('Authorization')) throw new AccessError(401, 'Authentication required.');
      if (options.authorized === false) throw new AccessError(403, 'Editor access is required.');
    },
    async createSignedUpload(input) {
      if (options.signerFailure) throw new Error('R2 credentials are unavailable.');
      signed.push(input);
      return 'https://account.r2.cloudflarestorage.com/bucket/signed';
    },
    async inspectObject() {
      if (options.inspectFailure) throw new Error('R2 request failed.');
      return options.storedObject ?? {
        contentType: 'audio/mpeg',
        contentLength: 2048,
        signature: new Uint8Array([0x49, 0x44, 0x33]),
      };
    },
    publicUrl: key => `https://media.example.test/${key}`,
    createObjectId: () => generatedId,
  });
  return { handler, signed };
}

const signRequest = (payload: Record<string, unknown>) => new Request('https://example.test/sadhana-media', {
  method: 'POST',
  headers: { Authorization: 'Bearer verified-admin', 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

test('authorizes editor and issues a unique conditional R2 upload URL', async () => {
  const { handler, signed } = makeHarness();
  const response = await handler(signRequest({
    action: 'sign',
    media_type: 'audio',
    content_type: 'audio/mpeg',
    size: 2048,
  }));
  const result = await body(response);
  assert.equal(response.status, 200);
  assert.equal(signed.length, 1);
  assert.deepEqual(signed[0], {
    objectKey: `sadhana-practices/${generatedId}.mp3`,
    contentType: 'audio/mpeg',
    contentLength: 2048,
  });
  assert.equal(result.object_key, `sadhana-practices/${generatedId}.mp3`);
  assert.equal(result.media_url, `https://media.example.test/sadhana-practices/${generatedId}.mp3`);
});

test('rejects unauthenticated and non-editor uploads before signing', async () => {
  const missingAuth = makeHarness();
  const response = await missingAuth.handler(new Request('https://example.test/sadhana-media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sign', media_type: 'image', content_type: 'image/png', size: 200 }),
  }));
  assert.equal(response.status, 401);
  assert.equal(missingAuth.signed.length, 0);

  const viewer = makeHarness({ authorized: false });
  const denied = await viewer.handler(signRequest({
    action: 'sign',
    media_type: 'image',
    content_type: 'image/png',
    size: 200,
  }));
  assert.equal(denied.status, 403);
  assert.equal(viewer.signed.length, 0);
});

test('rejects unsupported MIME types and oversized files server-side', async () => {
  const { handler, signed } = makeHarness();
  for (const payload of [
    { action: 'sign', media_type: 'image', content_type: 'image/svg+xml', size: 100 },
    { action: 'sign', media_type: 'audio', content_type: 'audio/mpeg', size: 25 * 1024 * 1024 + 1 },
    { action: 'sign', media_type: 'audio', content_type: 'image/png', size: 100 },
    { action: 'sign', media_type: 'image', content_type: 'image/png', size: 0 },
    { action: 'sign', media_type: 'image', content_type: 'image/png', size: 100, object_key: '../../overwrite' },
  ]) {
    const response = await handler(signRequest(payload));
    assert.ok(response.status === 400 || response.status === 413 || response.status === 415);
  }
  assert.equal(signed.length, 0);
});

test('reports R2 signing errors without exposing credentials', async () => {
  const { handler } = makeHarness({ signerFailure: true });
  const response = await handler(signRequest({
    action: 'sign',
    media_type: 'image',
    content_type: 'image/webp',
    size: 200,
  }));
  assert.equal(response.status, 503);
  assert.equal((await body(response)).error, 'Secure media upload could not be prepared.');
});

test('verifies completed object MIME and actual size before returning a media URL', async () => {
  const { handler } = makeHarness({
    storedObject: {
      contentType: 'audio/mpeg',
      contentLength: 2048,
      signature: new Uint8Array([0x49, 0x44, 0x33]),
    },
  });
  const response = await handler(signRequest({
    action: 'complete',
    object_key: `sadhana-practices/${generatedId}.mp3`,
  }));
  const result = await body(response);
  assert.equal(response.status, 200);
  assert.equal(result.media_type, 'audio');
  assert.equal(result.media_url, `https://media.example.test/sadhana-practices/${generatedId}.mp3`);
});

test('rejects absent, mistyped, and oversized uploaded objects', async () => {
  const key = `sadhana-practices/${generatedId}.png`;
  for (const storedObject of [
    null,
    { contentType: 'image/jpeg', contentLength: 200, signature: new Uint8Array([0xff, 0xd8, 0xff]) },
    {
      contentType: 'image/png',
      contentLength: 10 * 1024 * 1024 + 1,
      signature: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    },
    {
      contentType: 'image/png',
      contentLength: 200,
      signature: new Uint8Array([0xff, 0xd8, 0xff]),
    },
  ]) {
    const { handler } = makeHarness({ storedObject });
    const response = await handler(signRequest({ action: 'complete', object_key: key }));
    assert.ok(response.status === 404 || response.status === 422);
  }
});

test('reports R2 completion lookup failures safely', async () => {
  const { handler } = makeHarness({ inspectFailure: true });
  const response = await handler(signRequest({
    action: 'complete',
    object_key: `sadhana-practices/${generatedId}.mp3`,
  }));
  assert.equal(response.status, 503);
  assert.equal((await body(response)).error, 'Uploaded media could not be verified in storage.');
});
